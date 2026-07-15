-- ============================================================
-- MJUltraCRM - Funciones y triggers de negocio
-- Supabase / PostgreSQL
-- ============================================================

-- ============================================================
-- 1. Helper de cálculo de precio automático
-- ============================================================

-- Calcula el precio en ARS a partir del costo USD, margen y tipo de cambio.
create or replace function public.calcular_precio_automatico(
  costo_usd numeric,
  margen numeric,
  tc numeric
) returns numeric
language plpgsql
security definer
as $$
begin
  if costo_usd is null or margen is null or tc is null then
    raise exception 'Todos los parámetros son obligatorios';
  end if;
  if costo_usd < 0 or margen < 0 or tc <= 0 then
    raise exception 'Parámetros inválidos: costo_usd>=0, margen>=0, tc>0';
  end if;
  return round(costo_usd * tc * (1 + margen), 2);
end;
$$;

-- ============================================================
-- 2. Funciones de aplicación/reversión de movimientos de stock
-- ============================================================

-- Aplica el impacto de un movimiento sobre stock_central y stock_consignado.
create or replace function public.aplicar_movimiento_stock(p_mov public.movimientos_stock)
returns void
language plpgsql
security definer
as $$
begin
  if p_mov.tipo = 'compra' then
    update public.variantes
    set stock_central = stock_central + p_mov.cantidad
    where id = p_mov.variante_id;

  elsif p_mov.tipo = 'consignacion' then
    update public.variantes
    set stock_central = stock_central - p_mov.cantidad
    where id = p_mov.variante_id;

    insert into public.stock_consignado (variante_id, reventa_id, cantidad)
    values (p_mov.variante_id, p_mov.reventa_destino_id, p_mov.cantidad)
    on conflict (variante_id, reventa_id)
    do update set cantidad = public.stock_consignado.cantidad + excluded.cantidad;

  elsif p_mov.tipo = 'devolucion_consignacion' then
    update public.stock_consignado
    set cantidad = cantidad - p_mov.cantidad
    where variante_id = p_mov.variante_id
      and reventa_id = p_mov.reventa_origen_id;

    update public.variantes
    set stock_central = stock_central + p_mov.cantidad
    where id = p_mov.variante_id;

  elsif p_mov.tipo = 'venta' then
    if p_mov.reventa_origen_id is not null then
      update public.stock_consignado
      set cantidad = cantidad - p_mov.cantidad
      where variante_id = p_mov.variante_id
        and reventa_id = p_mov.reventa_origen_id;
    else
      update public.variantes
      set stock_central = stock_central - p_mov.cantidad
      where id = p_mov.variante_id;
    end if;

  elsif p_mov.tipo = 'ajuste' then
    update public.variantes
    set stock_central = stock_central + p_mov.cantidad
    where id = p_mov.variante_id;
  end if;
end;
$$;

-- Revierte el impacto de un movimiento sobre stock_central y stock_consignado.
create or replace function public.revertir_movimiento_stock(p_mov public.movimientos_stock)
returns void
language plpgsql
security definer
as $$
begin
  if p_mov.tipo = 'compra' then
    update public.variantes
    set stock_central = stock_central - p_mov.cantidad
    where id = p_mov.variante_id;

  elsif p_mov.tipo = 'consignacion' then
    update public.stock_consignado
    set cantidad = cantidad - p_mov.cantidad
    where variante_id = p_mov.variante_id
      and reventa_id = p_mov.reventa_destino_id;

    update public.variantes
    set stock_central = stock_central + p_mov.cantidad
    where id = p_mov.variante_id;

  elsif p_mov.tipo = 'devolucion_consignacion' then
    update public.variantes
    set stock_central = stock_central - p_mov.cantidad
    where id = p_mov.variante_id;

    insert into public.stock_consignado (variante_id, reventa_id, cantidad)
    values (p_mov.variante_id, p_mov.reventa_origen_id, p_mov.cantidad)
    on conflict (variante_id, reventa_id)
    do update set cantidad = public.stock_consignado.cantidad + excluded.cantidad;

  elsif p_mov.tipo = 'venta' then
    if p_mov.reventa_origen_id is not null then
      insert into public.stock_consignado (variante_id, reventa_id, cantidad)
      values (p_mov.variante_id, p_mov.reventa_origen_id, p_mov.cantidad)
      on conflict (variante_id, reventa_id)
      do update set cantidad = public.stock_consignado.cantidad + excluded.cantidad;
    else
      update public.variantes
      set stock_central = stock_central + p_mov.cantidad
      where id = p_mov.variante_id;
    end if;

  elsif p_mov.tipo = 'ajuste' then
    update public.variantes
    set stock_central = stock_central - p_mov.cantidad
    where id = p_mov.variante_id;
  end if;
end;
$$;

-- ============================================================
-- 3. Trigger: actualización de stock por movimientos_stock
-- ============================================================

create or replace function public.movimientos_stock_actualiza_stock()
returns trigger
language plpgsql
security definer
as $$
begin
  if TG_OP = 'INSERT' then
    perform public.aplicar_movimiento_stock(new);
    return new;

  elsif TG_OP = 'UPDATE' then
    perform public.revertir_movimiento_stock(old);
    perform public.aplicar_movimiento_stock(new);
    return new;

  elsif TG_OP = 'DELETE' then
    perform public.revertir_movimiento_stock(old);
    return old;
  end if;

  return null;
end;
$$;

create trigger trg_movimientos_stock_actualiza_stock
  after insert or update or delete on public.movimientos_stock
  for each row execute function public.movimientos_stock_actualiza_stock();

-- ============================================================
-- 4. Trigger: pagos actualizan estado de cobro de la venta
-- ============================================================

create or replace function public.pagos_actualiza_estado_cobro()
returns trigger
language plpgsql
security definer
as $$
declare
  v_total_ars numeric;
  v_suma_pagos numeric;
  v_anulada boolean;
  v_venta_id uuid;
begin
  if TG_OP = 'DELETE' then
    v_venta_id := old.venta_id;
  else
    v_venta_id := new.venta_id;
  end if;

  select total_ars, anulada into v_total_ars, v_anulada
  from public.ventas
  where id = v_venta_id;

  if not found then
    return null;
  end if;

  select coalesce(sum(monto_ars), 0) into v_suma_pagos
  from public.pagos
  where venta_id = v_venta_id;

  update public.ventas
  set estado_cobro = case
    when v_anulada then 'anulada'
    when v_suma_pagos >= v_total_ars then 'pagada'
    when v_suma_pagos > 0 then 'parcial'
    else 'pendiente'
  end
  where id = v_venta_id;

  return null;
end;
$$;

create trigger trg_pagos_actualiza_estado_cobro
  after insert or update or delete on public.pagos
  for each row execute function public.pagos_actualiza_estado_cobro();

-- ============================================================
-- 5. Trigger: cada pago genera un ingreso en caja
-- ============================================================

create or replace function public.pagos_crea_movimiento_caja()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.caja_movimientos (
    tipo,
    monto_ars,
    metodo,
    motivo,
    usuario_id,
    referencia_tipo,
    referencia_id
  ) values (
    'ingreso',
    new.monto_ars,
    new.metodo,
    'Pago recibido por venta ' || new.venta_id::text,
    new.usuario_id,
    'pago',
    new.id
  );

  return new;
end;
$$;

create trigger trg_pagos_crea_movimiento_caja
  after insert on public.pagos
  for each row execute function public.pagos_crea_movimiento_caja();

-- ============================================================
-- 6. Creación de perfiles
-- ============================================================
-- Los perfiles se crean explícitamente desde la aplicación (admin)
-- mediante usuariosService.crearReventa(). No se usa trigger automático
-- para mantener el control del flujo de registro y evitar conflictos.

-- ============================================================
-- 7. Trigger: evitar stock negativo
-- ============================================================

create or replace function public.evitar_stock_negativo()
returns trigger
language plpgsql
security definer
as $$
begin
  if TG_TABLE_NAME = 'variantes' and new.stock_central < 0 then
    raise exception 'El stock central de la variante % no puede ser negativo', new.id;
  end if;

  if TG_TABLE_NAME = 'stock_consignado' and new.cantidad < 0 then
    raise exception 'El stock consignado de la variante % para la reventa % no puede ser negativo',
      new.variante_id, new.reventa_id;
  end if;

  return new;
end;
$$;

create trigger trg_evitar_stock_negativo
  before update on public.variantes
  for each row execute function public.evitar_stock_negativo();

create trigger trg_evitar_stock_negativo
  before update on public.stock_consignado
  for each row execute function public.evitar_stock_negativo();

-- ============================================================
-- 8. RPC: crear consignación con líneas y movimientos de stock
-- ============================================================

create or replace function public.crear_consignacion(
  p_reventa_id uuid,
  p_lineas jsonb,
  p_usuario_id uuid,
  p_pedido_reposicion_id uuid default null
) returns uuid
language plpgsql
security definer
as $$
declare
  v_consignacion_id uuid;
  v_linea record;
  v_variante_id uuid;
  v_cantidad integer;
begin
  if p_lineas is null
     or jsonb_typeof(p_lineas) <> 'array'
     or jsonb_array_length(p_lineas) = 0
  then
    raise exception 'Debe enviar al menos una línea de consignación';
  end if;

  if not exists (
    select 1 from public.perfiles
    where id = p_reventa_id and rol = 'reventa' and activo = true
  ) then
    raise exception 'La reventa indicada no existe o no está activa';
  end if;

  -- Validar stock central suficiente para cada línea.
  for v_linea in
    select
      (l ->> 'variante_id')::uuid as variante_id,
      (l ->> 'cantidad')::integer as cantidad
    from jsonb_array_elements(p_lineas) as l
  loop
    if v_linea.cantidad is null or v_linea.cantidad <= 0 then
      raise exception 'La cantidad de cada línea debe ser mayor a cero';
    end if;

    if coalesce(
      (select stock_central from public.variantes where id = v_linea.variante_id),
      0
    ) < v_linea.cantidad then
      raise exception 'Stock central insuficiente para la variante %', v_linea.variante_id;
    end if;
  end loop;

  -- Crear cabecera de consignación.
  insert into public.consignaciones (reventa_id, estado, usuario_id, pedido_reposicion_id)
  values (p_reventa_id, 'activa', p_usuario_id, p_pedido_reposicion_id)
  returning id into v_consignacion_id;

  -- Crear líneas y movimientos de stock.
  for v_linea in
    select
      (l ->> 'variante_id')::uuid as variante_id,
      (l ->> 'cantidad')::integer as cantidad
    from jsonb_array_elements(p_lineas) as l
  loop
    insert into public.consignacion_lineas (consignacion_id, variante_id, cantidad)
    values (v_consignacion_id, v_linea.variante_id, v_linea.cantidad);

    insert into public.movimientos_stock (
      tipo,
      variante_id,
      cantidad,
      reventa_destino_id,
      referencia_tipo,
      referencia_id,
      usuario_id
    ) values (
      'consignacion',
      v_linea.variante_id,
      v_linea.cantidad,
      p_reventa_id,
      'consignacion',
      v_consignacion_id,
      p_usuario_id
    );
  end loop;

  return v_consignacion_id;
end;
$$;

-- ============================================================
-- 9. RPC: aprobar pedido de reposición y generar consignación
-- ============================================================

create or replace function public.aprobar_pedido_reposicion(
  p_pedido_id uuid,
  p_usuario_id uuid
) returns uuid
language plpgsql
security definer
as $$
declare
  v_reventa_id uuid;
  v_consignacion_id uuid;
  v_total_solicitada integer;
  v_total_aprobada integer;
  v_linea record;
  v_lineas_jsonb jsonb;
begin
  select reventa_id into v_reventa_id
  from public.pedidos_reposicion
  where id = p_pedido_id;

  if not found then
    raise exception 'Pedido de reposición no encontrado';
  end if;

  -- Validar stock central para las cantidades aprobadas.
  for v_linea in
    select prl.variante_id, prl.cantidad_aprobada
    from public.pedido_reposicion_lineas prl
    where prl.pedido_id = p_pedido_id
      and prl.cantidad_aprobada > 0
  loop
    if coalesce(
      (select stock_central from public.variantes where id = v_linea.variante_id),
      0
    ) < v_linea.cantidad_aprobada then
      raise exception 'Stock central insuficiente para la variante %', v_linea.variante_id;
    end if;
  end loop;

  select
    coalesce(sum(cantidad_solicitada), 0),
    coalesce(sum(cantidad_aprobada), 0)
  into v_total_solicitada, v_total_aprobada
  from public.pedido_reposicion_lineas
  where pedido_id = p_pedido_id;

  if v_total_aprobada = 0 then
    raise exception 'No hay cantidades aprobadas para generar la consignación';
  end if;

  -- Actualizar estado del pedido según aprobación total o parcial.
  update public.pedidos_reposicion
  set estado = case
    when v_total_aprobada = v_total_solicitada then 'aprobado'
    else 'aprobado_parcial'
  end
  where id = p_pedido_id;

  -- Armar jsonb de líneas aprobadas y crear la consignación.
  select jsonb_agg(
    jsonb_build_object(
      'variante_id', variante_id,
      'cantidad', cantidad_aprobada
    )
  )
  into v_lineas_jsonb
  from public.pedido_reposicion_lineas
  where pedido_id = p_pedido_id
    and cantidad_aprobada > 0;

  select public.crear_consignacion(v_reventa_id, v_lineas_jsonb, p_usuario_id)
  into v_consignacion_id;

  -- Asociar la consignación al pedido de reposición.
  update public.consignaciones
  set pedido_reposicion_id = p_pedido_id
  where id = v_consignacion_id;

  return v_consignacion_id;
end;
$$;

-- ============================================================
-- 10. RPC: registrar venta con stock, pagos y caja
-- ============================================================

create or replace function public.registrar_venta(p_venta jsonb)
returns uuid
language plpgsql
security definer
as $$
declare
  v_venta_id uuid;
  v_variante_id uuid;
  v_cantidad integer;
  v_lista_id uuid;
  v_total_ars numeric;
  v_tc_usado numeric;
  v_total_usd numeric;
  v_reventa_id uuid;
  v_usuario_id uuid;
  v_precio_unit_ars numeric;
  v_pago jsonb;
begin
  v_variante_id := (p_venta ->> 'variante_id')::uuid;
  v_cantidad    := (p_venta ->> 'cantidad')::integer;
  v_lista_id    := (p_venta ->> 'lista_id')::uuid;
  v_total_ars   := (p_venta ->> 'total_ars')::numeric;
  v_tc_usado    := (p_venta ->> 'tc_usado')::numeric;
  v_total_usd   := (p_venta ->> 'total_usd')::numeric;
  v_reventa_id  := (p_venta ->> 'reventa_id')::uuid;
  v_usuario_id  := (p_venta ->> 'usuario_id')::uuid;

  if v_variante_id is null or v_cantidad is null or v_cantidad <= 0 then
    raise exception 'La variante y la cantidad son obligatorias y la cantidad debe ser mayor a cero';
  end if;

  -- Validar stock según el origen de la venta.
  if v_reventa_id is not null then
    if coalesce(
      (select cantidad from public.stock_consignado
       where variante_id = v_variante_id and reventa_id = v_reventa_id),
      0
    ) < v_cantidad then
      raise exception 'Stock consignado insuficiente para la variante %', v_variante_id;
    end if;
  else
    if coalesce(
      (select stock_central from public.variantes where id = v_variante_id),
      0
    ) < v_cantidad then
      raise exception 'Stock central insuficiente para la variante %', v_variante_id;
    end if;
  end if;

  -- Crear venta.
  insert into public.ventas (
    fecha, usuario_id, reventa_id, lista_id,
    total_ars, tc_usado, total_usd, estado_cobro
  ) values (
    now(), v_usuario_id, v_reventa_id, v_lista_id,
    v_total_ars, v_tc_usado, v_total_usd, 'pendiente'
  )
  returning id into v_venta_id;

  -- Crear línea de venta.
  v_precio_unit_ars := case when v_cantidad > 0 then round(v_total_ars / v_cantidad, 2) else 0 end;

  insert into public.venta_lineas (
    venta_id, variante_id, cantidad, precio_unit_ars
  ) values (
    v_venta_id, v_variante_id, v_cantidad, v_precio_unit_ars
  );

  -- Crear movimiento de stock de venta.
  insert into public.movimientos_stock (
    tipo, variante_id, cantidad, reventa_origen_id,
    referencia_tipo, referencia_id, usuario_id
  ) values (
    'venta', v_variante_id, v_cantidad, v_reventa_id,
    'venta', v_venta_id, v_usuario_id
  );

  -- Procesar pagos opcionales.
  if p_venta ? 'pagos'
     and jsonb_typeof(p_venta -> 'pagos') = 'array'
     and jsonb_array_length(p_venta -> 'pagos') > 0
  then
    for v_pago in select * from jsonb_array_elements(p_venta -> 'pagos')
    loop
      insert into public.pagos (
        venta_id, monto_ars, metodo, usuario_id, comprobante_url
      ) values (
        v_venta_id,
        (v_pago ->> 'monto_ars')::numeric,
        v_pago ->> 'metodo',
        v_usuario_id,
        v_pago ->> 'comprobante_url'
      );
    end loop;
  end if;

  return v_venta_id;
end;
$$;

-- ============================================================
-- 11. RPC: anular venta, revertir stock y ajustar caja
-- ============================================================

create or replace function public.anular_venta(
  p_venta_id uuid,
  p_motivo text,
  p_usuario_id uuid
) returns void
language plpgsql
security definer
as $$
declare
  v_venta record;
  v_linea record;
  v_pago record;
begin
  select * into v_venta from public.ventas where id = p_venta_id;

  if not found then
    raise exception 'Venta no encontrada';
  end if;

  if v_venta.anulada then
    raise exception 'La venta ya se encuentra anulada';
  end if;

  if p_motivo is null or trim(p_motivo) = '' then
    raise exception 'El motivo de anulación es obligatorio';
  end if;

  -- Marcar venta como anulada.
  update public.ventas
  set anulada = true,
      motivo_anulacion = p_motivo,
      estado_cobro = 'anulada'
  where id = p_venta_id;

  -- Revertir stock por cada línea vendida.
  for v_linea in
    select * from public.venta_lineas where venta_id = p_venta_id
  loop
    insert into public.movimientos_stock (
      tipo, variante_id, cantidad, reventa_origen_id,
      referencia_tipo, referencia_id, motivo, usuario_id
    ) values (
      'ajuste', v_linea.variante_id, v_linea.cantidad, v_venta.reventa_id,
      'venta', p_venta_id,
      'Reverso por anulación de venta: ' || p_motivo,
      p_usuario_id
    );
  end loop;

  -- Ajustar caja generando egresos por cada pago recibido.
  for v_pago in
    select * from public.pagos where venta_id = p_venta_id
  loop
    insert into public.caja_movimientos (
      tipo, monto_ars, metodo, motivo, usuario_id,
      referencia_tipo, referencia_id
    ) values (
      'egreso', v_pago.monto_ars, v_pago.metodo,
      'Reverso de pago por anulación de venta ' || p_venta_id::text,
      p_usuario_id, 'venta', p_venta_id
    );
  end loop;
end;
$$;

-- ============================================================
-- 12. Permisos de ejecución
-- ============================================================

grant execute on function public.calcular_precio_automatico(numeric, numeric, numeric) to authenticated;
grant execute on function public.crear_consignacion(uuid, jsonb, uuid) to authenticated;
grant execute on function public.aprobar_pedido_reposicion(uuid, uuid) to authenticated;
grant execute on function public.registrar_venta(jsonb) to authenticated;
grant execute on function public.anular_venta(uuid, text, uuid) to authenticated;

-- ============================================================
-- MJUltraCRM - Script SQL Fase 1
-- Esquema completo de base de datos + Row Level Security (RLS)
-- Supabase / PostgreSQL
-- ============================================================

-- Extensiones necesarias
create extension if not exists "pgcrypto" with schema extensions;

-- ============================================================
-- 1. Tablas base (Fase 1)
-- ============================================================

-- Usuarios / perfiles (extiende auth.users de Supabase)
create table public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  email text not null unique,
  rol text not null check (rol in ('admin', 'reventa')),
  activo boolean not null default true,
  telefono text,
  direccion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Catálogo: categorías
create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Catálogo: atributos dinámicos (Sabor, Talle, Color, etc.)
create table public.atributos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Catálogo: valores posibles de cada atributo
create table public.atributo_valores (
  id uuid primary key default gen_random_uuid(),
  atributo_id uuid not null references public.atributos(id) on delete cascade,
  valor text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (atributo_id, valor)
);

-- Catálogo: productos generales
create table public.productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria_id uuid references public.categorias(id) on delete restrict,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Relación: qué atributos usa cada producto
create table public.producto_atributos (
  producto_id uuid not null references public.productos(id) on delete cascade,
  atributo_id uuid not null references public.atributos(id) on delete cascade,
  primary key (producto_id, atributo_id)
);

-- Catálogo: variantes de producto (SKU, costo en USD, stock central)
create table public.variantes (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos(id) on delete cascade,
  sku text unique,
  costo_usd numeric(12, 2) not null check (costo_usd >= 0),
  stock_central integer not null default 0 check (stock_central >= 0),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Relación: combinación de valores de atributos de cada variante
create table public.variante_atributos (
  variante_id uuid not null references public.variantes(id) on delete cascade,
  atributo_valor_id uuid not null references public.atributo_valores(id) on delete restrict,
  primary key (variante_id, atributo_valor_id)
);

-- Historial de cambios de costo en USD
create table public.costos_historial (
  id uuid primary key default gen_random_uuid(),
  variante_id uuid not null references public.variantes(id) on delete cascade,
  costo_usd numeric(12, 2) not null check (costo_usd >= 0),
  fecha timestamptz not null default now(),
  usuario_id uuid not null references public.perfiles(id) on delete restrict
);

-- Listas de precios (Reventa, Comunidad, Público)
create table public.listas_precios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  margen numeric(5, 4) not null check (margen >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Precios por variante y lista (automáticos o manuales)
create table public.precios (
  id uuid primary key default gen_random_uuid(),
  variante_id uuid not null references public.variantes(id) on delete cascade,
  lista_id uuid not null references public.listas_precios(id) on delete cascade,
  precio_ars numeric(12, 2) not null check (precio_ars >= 0),
  es_manual boolean not null default false,
  fecha timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (variante_id, lista_id)
);

-- Tipos de cambio cargados por el admin
create table public.tipos_cambio (
  id uuid primary key default gen_random_uuid(),
  valor numeric(10, 4) not null check (valor > 0),
  fecha timestamptz not null default now(),
  usuario_id uuid not null references public.perfiles(id) on delete restrict
);

-- ============================================================
-- 2. Tablas de consignación y stock (Fase 2)
-- ============================================================

-- Pedidos de reposición creados por las reventas
create table public.pedidos_reposicion (
  id uuid primary key default gen_random_uuid(),
  reventa_id uuid not null references public.perfiles(id) on delete restrict,
  estado text not null check (estado in ('pendiente', 'aprobado', 'aprobado_parcial', 'rechazado')) default 'pendiente',
  motivo_rechazo text,
  usuario_id uuid not null references public.perfiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_pedido_rechazo_motivo check (
    estado <> 'rechazado' or motivo_rechazo is not null
  )
);

-- Líneas de pedido de reposición
create table public.pedido_reposicion_lineas (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos_reposicion(id) on delete cascade,
  variante_id uuid not null references public.variantes(id) on delete restrict,
  cantidad_solicitada integer not null check (cantidad_solicitada > 0),
  cantidad_aprobada integer check (cantidad_aprobada is null or cantidad_aprobada >= 0),
  constraint chk_cantidad_aprobada check (
    cantidad_aprobada is null or cantidad_aprobada <= cantidad_solicitada
  )
);

-- Entregas en consignación creadas por el admin
create table public.consignaciones (
  id uuid primary key default gen_random_uuid(),
  reventa_id uuid not null references public.perfiles(id) on delete restrict,
  pedido_reposicion_id uuid references public.pedidos_reposicion(id) on delete set null,
  fecha timestamptz not null default now(),
  estado text not null check (estado in ('activa', 'anulada', 'devuelta')) default 'activa',
  motivo_anulacion text,
  usuario_id uuid not null references public.perfiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_consignacion_anulada_motivo check (
    estado <> 'anulada' or motivo_anulacion is not null
  )
);

-- Líneas de consignación
create table public.consignacion_lineas (
  id uuid primary key default gen_random_uuid(),
  consignacion_id uuid not null references public.consignaciones(id) on delete cascade,
  variante_id uuid not null references public.variantes(id) on delete restrict,
  cantidad integer not null check (cantidad > 0)
);

-- Stock consignado por variante y reventa (derivado, se mantiene por la app/triggers)
create table public.stock_consignado (
  variante_id uuid not null references public.variantes(id) on delete cascade,
  reventa_id uuid not null references public.perfiles(id) on delete cascade,
  cantidad integer not null default 0 check (cantidad >= 0),
  primary key (variante_id, reventa_id)
);

-- Movimientos auditados de stock
create table public.movimientos_stock (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('compra', 'consignacion', 'devolucion_consignacion', 'venta', 'ajuste')),
  variante_id uuid not null references public.variantes(id) on delete restrict,
  cantidad integer not null check (cantidad > 0),
  reventa_origen_id uuid references public.perfiles(id) on delete restrict,
  reventa_destino_id uuid references public.perfiles(id) on delete restrict,
  referencia_tipo text check (referencia_tipo in ('compra', 'consignacion', 'venta', 'ajuste')),
  referencia_id uuid,
  motivo text,
  usuario_id uuid not null references public.perfiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint chk_movimiento_ajuste_motivo check (
    tipo <> 'ajuste' or motivo is not null
  )
);

-- ============================================================
-- 3. Tablas de ventas, pagos y deudas (Fase 3)
-- ============================================================

-- Ventas (ARS con snapshot USD congelado)
create table public.ventas (
  id uuid primary key default gen_random_uuid(),
  fecha timestamptz not null default now(),
  usuario_id uuid not null references public.perfiles(id) on delete restrict,
  reventa_id uuid references public.perfiles(id) on delete restrict,
  lista_id uuid not null references public.listas_precios(id) on delete restrict,
  total_ars numeric(12, 2) not null check (total_ars >= 0),
  tc_usado numeric(10, 4) not null check (tc_usado > 0),
  total_usd numeric(12, 2) not null check (total_usd >= 0),
  estado_cobro text not null check (estado_cobro in ('pendiente', 'parcial', 'pagada', 'anulada')) default 'pendiente',
  anulada boolean not null default false,
  motivo_anulacion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_venta_anulada_motivo check (
    not anulada or motivo_anulacion is not null
  )
);

-- Líneas de venta
create table public.venta_lineas (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas(id) on delete cascade,
  variante_id uuid not null references public.variantes(id) on delete restrict,
  cantidad integer not null check (cantidad > 0),
  precio_unit_ars numeric(12, 2) not null check (precio_unit_ars >= 0),
  precio_manual boolean not null default false,
  total_linea_ars numeric(12, 2) generated always as (cantidad * precio_unit_ars) stored
);

-- Pagos asociados a ventas
create table public.pagos (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas(id) on delete cascade,
  monto_ars numeric(12, 2) not null check (monto_ars > 0),
  metodo text not null check (metodo in ('efectivo', 'transferencia')),
  fecha timestamptz not null default now(),
  usuario_id uuid not null references public.perfiles(id) on delete restrict,
  comprobante_url text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 4. Tablas de caja y arqueo (Fase 4)
-- ============================================================

-- Movimientos de caja continua
create table public.caja_movimientos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('ingreso', 'egreso', 'gasto')),
  monto_ars numeric(12, 2) not null check (monto_ars >= 0),
  metodo text not null check (metodo in ('efectivo', 'transferencia')),
  motivo text not null,
  usuario_id uuid not null references public.perfiles(id) on delete restrict,
  referencia_tipo text check (referencia_tipo in ('venta', 'pago', 'consignacion', 'arqueo', 'manual')),
  referencia_id uuid,
  created_at timestamptz not null default now()
);

-- Arqueos de caja
create table public.arqueos (
  id uuid primary key default gen_random_uuid(),
  fecha timestamptz not null default now(),
  usuario_id uuid not null references public.perfiles(id) on delete restrict,
  observaciones text,
  created_at timestamptz not null default now()
);

-- Saldos por método de cada arqueo
create table public.arqueo_saldos (
  id uuid primary key default gen_random_uuid(),
  arqueo_id uuid not null references public.arqueos(id) on delete cascade,
  metodo text not null check (metodo in ('efectivo', 'transferencia')),
  saldo_teorico numeric(12, 2) not null,
  saldo_real numeric(12, 2) not null,
  diferencia numeric(12, 2) not null,
  unique (arqueo_id, metodo)
);

-- ============================================================
-- 5. Funciones helper para políticas RLS
-- ============================================================

create or replace function public.rol_actual()
returns text
language sql
stable
security definer
as $$
  select rol
  from public.perfiles
  where id = auth.uid();
$$;

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
as $$
  select exists(
    select 1
    from public.perfiles
    where id = auth.uid()
      and rol = 'admin'
  );
$$;

create or replace function public.es_reventa()
returns boolean
language sql
stable
security definer
as $$
  select exists(
    select 1
    from public.perfiles
    where id = auth.uid()
      and rol = 'reventa'
  );
$$;

create or replace function public.venta_pertenece_a_reventa(p_venta_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists(
    select 1
    from public.ventas
    where id = p_venta_id
      and reventa_id = auth.uid()
  );
$$;

create or replace function public.pedido_pertenece_a_reventa(p_pedido_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists(
    select 1
    from public.pedidos_reposicion
    where id = p_pedido_id
      and reventa_id = auth.uid()
  );
$$;

create or replace function public.consignacion_pertenece_a_reventa(p_consignacion_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists(
    select 1
    from public.consignaciones
    where id = p_consignacion_id
      and reventa_id = auth.uid()
  );
$$;

grant usage on schema public to anon, authenticated;
grant execute on function public.rol_actual() to authenticated;
grant execute on function public.es_admin() to authenticated;
grant execute on function public.es_reventa() to authenticated;
grant execute on function public.venta_pertenece_a_reventa(uuid) to authenticated;
grant execute on function public.pedido_pertenece_a_reventa(uuid) to authenticated;
grant execute on function public.consignacion_pertenece_a_reventa(uuid) to authenticated;

-- ============================================================
-- 6. Triggers
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.registrar_costo_historial()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'INSERT' or old.costo_usd is distinct from new.costo_usd then
    insert into public.costos_historial(variante_id, costo_usd, usuario_id)
    values (new.id, new.costo_usd, auth.uid());
  end if;
  return new;
end;
$$;

-- Aplicar trigger de updated_at
-- Fase 1
-- Triggers de actualización de timestamp

create trigger trg_perfiles_set_updated_at
  before update on public.perfiles
  for each row execute function public.set_updated_at();

create trigger trg_categorias_set_updated_at
  before update on public.categorias
  for each row execute function public.set_updated_at();

create trigger trg_atributos_set_updated_at
  before update on public.atributos
  for each row execute function public.set_updated_at();

create trigger trg_atributo_valores_set_updated_at
  before update on public.atributo_valores
  for each row execute function public.set_updated_at();

create trigger trg_productos_set_updated_at
  before update on public.productos
  for each row execute function public.set_updated_at();

create trigger trg_variantes_set_updated_at
  before update on public.variantes
  for each row execute function public.set_updated_at();

create trigger trg_listas_precios_set_updated_at
  before update on public.listas_precios
  for each row execute function public.set_updated_at();

create trigger trg_precios_set_updated_at
  before update on public.precios
  for each row execute function public.set_updated_at();

-- Fase 2
create trigger trg_pedidos_reposicion_set_updated_at
  before update on public.pedidos_reposicion
  for each row execute function public.set_updated_at();

create trigger trg_consignaciones_set_updated_at
  before update on public.consignaciones
  for each row execute function public.set_updated_at();

-- Fase 3
create trigger trg_ventas_set_updated_at
  before update on public.ventas
  for each row execute function public.set_updated_at();

-- Trigger de historial de costos
create trigger trg_variantes_registrar_costo_historial
  after insert or update of costo_usd on public.variantes
  for each row execute function public.registrar_costo_historial();

-- ============================================================
-- 7. Índices para rendimiento y FKs
-- ============================================================

-- Perfiles
create index idx_perfiles_rol on public.perfiles(rol);
create index idx_perfiles_email on public.perfiles(email);

-- Catálogo
create index idx_atributo_valores_atributo_id on public.atributo_valores(atributo_id);
create index idx_productos_categoria_id on public.productos(categoria_id);
create index idx_producto_atributos_producto_id on public.producto_atributos(producto_id);
create index idx_producto_atributos_atributo_id on public.producto_atributos(atributo_id);
create index idx_variantes_producto_id on public.variantes(producto_id);
create index idx_variantes_sku on public.variantes(sku);
create index idx_variante_atributos_variante_id on public.variante_atributos(variante_id);
create index idx_variante_atributos_atributo_valor_id on public.variante_atributos(atributo_valor_id);
create index idx_costos_historial_variante_id on public.costos_historial(variante_id);
create index idx_costos_historial_fecha on public.costos_historial(fecha desc);
create index idx_precios_variante_id on public.precios(variante_id);
create index idx_precios_lista_id on public.precios(lista_id);
create index idx_tipos_cambio_fecha on public.tipos_cambio(fecha desc);

-- Consignación y stock
create index idx_pedidos_reposicion_reventa_id on public.pedidos_reposicion(reventa_id);
create index idx_pedidos_reposicion_estado on public.pedidos_reposicion(estado);
create index idx_pedido_reposicion_lineas_pedido_id on public.pedido_reposicion_lineas(pedido_id);
create index idx_pedido_reposicion_lineas_variante_id on public.pedido_reposicion_lineas(variante_id);
create index idx_consignaciones_reventa_id on public.consignaciones(reventa_id);
create index idx_consignaciones_estado on public.consignaciones(estado);
create index idx_consignacion_lineas_consignacion_id on public.consignacion_lineas(consignacion_id);
create index idx_consignacion_lineas_variante_id on public.consignacion_lineas(variante_id);
create index idx_stock_consignado_reventa_id on public.stock_consignado(reventa_id);
create index idx_stock_consignado_variante_id on public.stock_consignado(variante_id);
create index idx_movimientos_stock_variante_id on public.movimientos_stock(variante_id);
create index idx_movimientos_stock_reventa_origen_id on public.movimientos_stock(reventa_origen_id);
create index idx_movimientos_stock_reventa_destino_id on public.movimientos_stock(reventa_destino_id);
create index idx_movimientos_stock_tipo on public.movimientos_stock(tipo);
create index idx_movimientos_stock_created_at on public.movimientos_stock(created_at desc);

-- Ventas y pagos
create index idx_ventas_reventa_id on public.ventas(reventa_id);
create index idx_ventas_usuario_id on public.ventas(usuario_id);
create index idx_ventas_fecha on public.ventas(fecha desc);
create index idx_ventas_estado_cobro on public.ventas(estado_cobro);
create index idx_venta_lineas_venta_id on public.venta_lineas(venta_id);
create index idx_venta_lineas_variante_id on public.venta_lineas(variante_id);
create index idx_pagos_venta_id on public.pagos(venta_id);
create index idx_pagos_usuario_id on public.pagos(usuario_id);
create index idx_pagos_fecha on public.pagos(fecha desc);

-- Caja y arqueos
create index idx_caja_movimientos_usuario_id on public.caja_movimientos(usuario_id);
create index idx_caja_movimientos_metodo on public.caja_movimientos(metodo);
create index idx_caja_movimientos_tipo on public.caja_movimientos(tipo);
create index idx_caja_movimientos_fecha on public.caja_movimientos(created_at desc);
create index idx_caja_movimientos_referencia on public.caja_movimientos(referencia_tipo, referencia_id);
create index idx_arqueos_usuario_id on public.arqueos(usuario_id);
create index idx_arqueos_fecha on public.arqueos(fecha desc);
create index idx_arqueo_saldos_arqueo_id on public.arqueo_saldos(arqueo_id);

-- ============================================================
-- 8. Row Level Security (RLS)
-- ============================================================

-- ----------------------------------------------------------
-- 8.1 Perfiles
-- ----------------------------------------------------------
alter table public.perfiles enable row level security;

create policy "perfiles_admin_todo"
  on public.perfiles
  for all
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

create policy "perfiles_reventa_gestionar_propio"
  on public.perfiles
  for all
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ----------------------------------------------------------
-- 8.2 Catálogo: solo admin
-- ----------------------------------------------------------
alter table public.categorias enable row level security;
create policy "categorias_admin_todo"
  on public.categorias
  for all
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

alter table public.atributos enable row level security;
create policy "atributos_admin_todo"
  on public.atributos
  for all
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

alter table public.atributo_valores enable row level security;
create policy "atributo_valores_admin_todo"
  on public.atributo_valores
  for all
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

alter table public.productos enable row level security;
create policy "productos_admin_todo"
  on public.productos
  for all
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

alter table public.producto_atributos enable row level security;
create policy "producto_atributos_admin_todo"
  on public.producto_atributos
  for all
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

alter table public.variantes enable row level security;
create policy "variantes_admin_todo"
  on public.variantes
  for all
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

alter table public.variante_atributos enable row level security;
create policy "variante_atributos_admin_todo"
  on public.variante_atributos
  for all
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- Costos: información sensible, solo admin
alter table public.costos_historial enable row level security;
create policy "costos_historial_admin_todo"
  on public.costos_historial
  for all
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- Precios: solo admin carga/edita
alter table public.listas_precios enable row level security;
create policy "listas_precios_admin_todo"
  on public.listas_precios
  for all
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

alter table public.precios enable row level security;
create policy "precios_admin_todo"
  on public.precios
  for all
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- Tipo de cambio: solo admin
alter table public.tipos_cambio enable row level security;
create policy "tipos_cambio_admin_todo"
  on public.tipos_cambio
  for all
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- ----------------------------------------------------------
-- 8.3 Consignación y stock
-- ----------------------------------------------------------

-- Pedidos de reposición: reventa gestiona los suyos; admin gestiona todos
alter table public.pedidos_reposicion enable row level security;

create policy "pedidos_reposicion_admin_todo"
  on public.pedidos_reposicion
  for all
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

create policy "pedidos_reposicion_reventa_gestionar_propios"
  on public.pedidos_reposicion
  for all
  to authenticated
  using (public.es_reventa() and reventa_id = auth.uid())
  with check (public.es_reventa() and reventa_id = auth.uid());

-- Líneas de pedido de reposición
alter table public.pedido_reposicion_lineas enable row level security;

create policy "pedido_reposicion_lineas_admin_todo"
  on public.pedido_reposicion_lineas
  for all
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

create policy "pedido_reposicion_lineas_reventa_gestionar_propias"
  on public.pedido_reposicion_lineas
  for all
  to authenticated
  using (public.es_reventa() and public.pedido_pertenece_a_reventa(pedido_id))
  with check (public.es_reventa() and public.pedido_pertenece_a_reventa(pedido_id));

-- Consignaciones: reventa solo ve las suyas
alter table public.consignaciones enable row level security;

create policy "consignaciones_admin_todo"
  on public.consignaciones
  for all
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

create policy "consignaciones_reventa_ver_propias"
  on public.consignaciones
  for select
  to authenticated
  using (public.es_reventa() and public.consignacion_pertenece_a_reventa(id));

-- Líneas de consignación
alter table public.consignacion_lineas enable row level security;

create policy "consignacion_lineas_admin_todo"
  on public.consignacion_lineas
  for all
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

create policy "consignacion_lineas_reventa_ver_propias"
  on public.consignacion_lineas
  for select
  to authenticated
  using (public.es_reventa() and public.consignacion_pertenece_a_reventa(consignacion_id));

-- Stock consignado: reventa solo ve su propio stock
alter table public.stock_consignado enable row level security;

create policy "stock_consignado_admin_todo"
  on public.stock_consignado
  for all
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

create policy "stock_consignado_reventa_ver_propio"
  on public.stock_consignado
  for select
  to authenticated
  using (public.es_reventa() and reventa_id = auth.uid());

-- Movimientos de stock: reventa solo ve los que la afectan
alter table public.movimientos_stock enable row level security;

create policy "movimientos_stock_admin_todo"
  on public.movimientos_stock
  for all
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

create policy "movimientos_stock_reventa_ver_propios"
  on public.movimientos_stock
  for select
  to authenticated
  using (
    public.es_reventa()
    and (reventa_origen_id = auth.uid() or reventa_destino_id = auth.uid())
  );

-- ----------------------------------------------------------
-- 8.4 Ventas, pagos y deudas
-- ----------------------------------------------------------

-- Ventas: reventa ve, crea y actualiza solo las suyas. No borra.
alter table public.ventas enable row level security;

create policy "ventas_admin_todo"
  on public.ventas
  for all
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

create policy "ventas_reventa_ver"
  on public.ventas
  for select
  to authenticated
  using (public.es_reventa() and reventa_id = auth.uid());

create policy "ventas_reventa_insertar"
  on public.ventas
  for insert
  to authenticated
  with check (public.es_reventa() and reventa_id = auth.uid());

create policy "ventas_reventa_actualizar"
  on public.ventas
  for update
  to authenticated
  using (public.es_reventa() and reventa_id = auth.uid())
  with check (public.es_reventa() and reventa_id = auth.uid());

-- Líneas de venta
alter table public.venta_lineas enable row level security;

create policy "venta_lineas_admin_todo"
  on public.venta_lineas
  for all
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

create policy "venta_lineas_reventa_ver"
  on public.venta_lineas
  for select
  to authenticated
  using (public.es_reventa() and public.venta_pertenece_a_reventa(venta_id));

create policy "venta_lineas_reventa_insertar"
  on public.venta_lineas
  for insert
  to authenticated
  with check (public.es_reventa() and public.venta_pertenece_a_reventa(venta_id));

create policy "venta_lineas_reventa_actualizar"
  on public.venta_lineas
  for update
  to authenticated
  using (public.es_reventa() and public.venta_pertenece_a_reventa(venta_id))
  with check (public.es_reventa() and public.venta_pertenece_a_reventa(venta_id));

-- Pagos: reventa solo opera sobre pagos de sus propias ventas
alter table public.pagos enable row level security;

create policy "pagos_admin_todo"
  on public.pagos
  for all
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

create policy "pagos_reventa_ver"
  on public.pagos
  for select
  to authenticated
  using (public.es_reventa() and public.venta_pertenece_a_reventa(venta_id));

create policy "pagos_reventa_insertar"
  on public.pagos
  for insert
  to authenticated
  with check (public.es_reventa() and public.venta_pertenece_a_reventa(venta_id));

create policy "pagos_reventa_actualizar"
  on public.pagos
  for update
  to authenticated
  using (public.es_reventa() and public.venta_pertenece_a_reventa(venta_id))
  with check (public.es_reventa() and public.venta_pertenece_a_reventa(venta_id));

-- ----------------------------------------------------------
-- 8.5 Caja y arqueos: solo admin
-- ----------------------------------------------------------
alter table public.caja_movimientos enable row level security;
create policy "caja_movimientos_admin_todo"
  on public.caja_movimientos
  for all
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

alter table public.arqueos enable row level security;
create policy "arqueos_admin_todo"
  on public.arqueos
  for all
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

alter table public.arqueo_saldos enable row level security;
create policy "arqueo_saldos_admin_todo"
  on public.arqueo_saldos
  for all
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- ============================================================
-- 9. Storage: bucket de comprobantes de pago
-- ============================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'comprobantes',
  'comprobantes',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

-- Admin: control total sobre el bucket
create policy "comprobantes_admin_todo"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'comprobantes' and public.es_admin())
  with check (bucket_id = 'comprobantes' and public.es_admin());

-- Reventa: solo dentro de su carpeta reventas/{uid}/...
create policy "comprobantes_reventa_subir"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'comprobantes'
    and public.es_reventa()
    and name like 'reventas/' || auth.uid()::text || '/%'
  );

create policy "comprobantes_reventa_gestionar_propios"
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'comprobantes'
    and public.es_reventa()
    and name like 'reventas/' || auth.uid()::text || '/%'
  )
  with check (
    bucket_id = 'comprobantes'
    and public.es_reventa()
    and name like 'reventas/' || auth.uid()::text || '/%'
  );

-- ============================================================
-- 10. Seeds iniciales
-- ============================================================

-- Listas de precios por defecto
insert into public.listas_precios (nombre, margen)
values
  ('Reventa', 0.30),
  ('Comunidad', 0.60),
  ('Público', 0.80)
on conflict (nombre) do nothing;

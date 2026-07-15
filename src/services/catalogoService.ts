import { supabase } from '../lib/supabase';
import { CatalogoError, handleSupabaseError } from '../utils/errors';
import {
  validarNombre,
  validarId,
  validarListaIds,
  validarMontoPositivo,
  validarOpcionalMontoNoNegativo,
  validarSku,
} from '../utils/validators';
import type {
  Categoria,
  CategoriaForm,
  Atributo,
  AtributoValor,
  AtributoValorForm,
  AtributoForm,
  AtributoConValores,
  Producto,
  ProductoAtributo,
  ProductoForm,
  Variante,
  VarianteAtributo,
  VarianteForm,
  VarianteUpdateForm,
} from '../types/catalogo';
import type {
  AtributoValorInsert,
  ProductoInsert,
  ProductoUpdate,
  ProductoAtributoInsert,
  VarianteInsert,
  VarianteUpdate,
  VarianteAtributoInsert,
} from '../types/database.types';

// ------------------------------------------------------------------
// Tipos extendidos para selects anidados
// ------------------------------------------------------------------

export interface ProductoListado extends Producto {
  categorias: Categoria | null;
  producto_atributos: (ProductoAtributo & { atributos: Atributo })[];
}

export interface VarianteListado extends Variante {
  variante_atributos: (VarianteAtributo & { atributo_valores: AtributoValor })[];
}

// ------------------------------------------------------------------
// Helpers privados
// ------------------------------------------------------------------

async function asignarAtributosAProducto(
  productoId: string,
  atributoIds: string[]
): Promise<void> {
  if (atributoIds.length === 0) return;

  const relaciones: ProductoAtributoInsert[] = atributoIds.map((atributoId) => ({
    producto_id: productoId,
    atributo_id: atributoId,
  }));

  const { error } = await supabase.from('producto_atributos').insert(relaciones);
  if (error) handleSupabaseError(error);
}

async function reemplazarAtributosDeProducto(
  productoId: string,
  atributoIds: string[]
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('producto_atributos')
    .delete()
    .eq('producto_id', productoId);

  if (deleteError) handleSupabaseError(deleteError);

  await asignarAtributosAProducto(productoId, atributoIds);
}

async function asignarAtributosAVariante(
  varianteId: string,
  atributoValorIds: string[]
): Promise<void> {
  if (atributoValorIds.length === 0) return;

  const relaciones: VarianteAtributoInsert[] = atributoValorIds.map(
    (atributoValorId) => ({
      variante_id: varianteId,
      atributo_valor_id: atributoValorId,
    })
  );

  const { error } = await supabase.from('variante_atributos').insert(relaciones);
  if (error) handleSupabaseError(error);
}

async function reemplazarAtributosDeVariante(
  varianteId: string,
  atributoValorIds: string[]
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('variante_atributos')
    .delete()
    .eq('variante_id', varianteId);

  if (deleteError) handleSupabaseError(deleteError);

  await asignarAtributosAVariante(varianteId, atributoValorIds);
}

function normalizarAtributoValores(
  valores: AtributoValorForm[]
): AtributoValorForm[] {
  return valores
    .map((v) => ({ ...v, valor: v.valor.trim() }))
    .filter((v) => v.valor.length > 0);
}

// Re-exportar tipos base usados por las páginas.
export type { Categoria, AtributoConValores } from '../types/catalogo';

// ------------------------------------------------------------------
// Categorías
// ------------------------------------------------------------------

export async function listarCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .order('nombre');

  if (error) handleSupabaseError(error);
  return data ?? [];
}

export async function obtenerCategoria(id: string): Promise<Categoria> {
  const idLimpio = validarId(id, 'ID de categoría');

  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .eq('id', idLimpio)
    .single();

  if (error) handleSupabaseError(error);
  if (!data) throw new CatalogoError('No se encontró la categoría solicitada.');
  return data;
}

export async function crearCategoria(form: CategoriaForm): Promise<Categoria> {
  const nombre = validarNombre(form.nombre, 'Nombre de categoría');

  const { data, error } = await supabase
    .from('categorias')
    .insert({ nombre })
    .select()
    .single();

  if (error) handleSupabaseError(error);
  if (!data) throw new CatalogoError('No se pudo crear la categoría.');
  return data;
}

export async function actualizarCategoria(
  id: string,
  form: CategoriaForm
): Promise<Categoria> {
  const idLimpio = validarId(id, 'ID de categoría');
  const nombre = validarNombre(form.nombre, 'Nombre de categoría');

  const { data, error } = await supabase
    .from('categorias')
    .update({ nombre })
    .eq('id', idLimpio)
    .select()
    .single();

  if (error) handleSupabaseError(error);
  if (!data) throw new CatalogoError('No se encontró la categoría para actualizar.');
  return data;
}

export async function eliminarCategoria(id: string): Promise<void> {
  const idLimpio = validarId(id, 'ID de categoría');

  const { error } = await supabase.from('categorias').delete().eq('id', idLimpio);
  if (error) handleSupabaseError(error);
}

// ------------------------------------------------------------------
// Atributos dinámicos y sus valores
// ------------------------------------------------------------------

export async function listarAtributosConValores(): Promise<AtributoConValores[]> {
  const { data, error } = await supabase
    .from('atributos')
    .select('*, atributo_valores(*)')
    .order('nombre')
    .returns<AtributoConValores[]>();

  if (error) handleSupabaseError(error);
  return data ?? [];
}

export async function obtenerAtributoConValores(
  id: string
): Promise<AtributoConValores> {
  const idLimpio = validarId(id, 'ID de atributo');

  const { data, error } = await supabase
    .from('atributos')
    .select('*, atributo_valores(*)')
    .eq('id', idLimpio)
    .single()
    .returns<AtributoConValores>();

  if (error) handleSupabaseError(error);
  if (!data) throw new CatalogoError('No se encontró el atributo solicitado.');
  return data;
}

export async function crearAtributo(
  form: AtributoForm
): Promise<AtributoConValores> {
  const nombre = validarNombre(form.nombre, 'Nombre de atributo');
  const valores = normalizarAtributoValores(form.valores);

  const { data: atributo, error } = await supabase
    .from('atributos')
    .insert({ nombre })
    .select()
    .single();

  if (error) handleSupabaseError(error);
  if (!atributo) throw new CatalogoError('No se pudo crear el atributo.');

  if (valores.length > 0) {
    const valoresInsert: AtributoValorInsert[] = valores.map((v) => ({
      atributo_id: atributo.id,
      valor: v.valor,
    }));

    const { data: valoresCreados, error: errorValores } = await supabase
      .from('atributo_valores')
      .insert(valoresInsert)
      .select()
      .returns<AtributoValor[]>();

    if (errorValores) {
      // Rollback manual: eliminar el atributo creado
      await supabase.from('atributos').delete().eq('id', atributo.id);
      handleSupabaseError(errorValores);
    }

    return { ...atributo, atributo_valores: valoresCreados ?? [] };
  }

  return { ...atributo, atributo_valores: [] };
}

export async function actualizarAtributo(
  id: string,
  form: AtributoForm
): Promise<AtributoConValores> {
  const idLimpio = validarId(id, 'ID de atributo');
  const nombre = validarNombre(form.nombre, 'Nombre de atributo');
  const valoresForm = normalizarAtributoValores(form.valores);

  const { data: atributo, error } = await supabase
    .from('atributos')
    .update({ nombre })
    .eq('id', idLimpio)
    .select()
    .single();

  if (error) handleSupabaseError(error);
  if (!atributo) throw new CatalogoError('No se encontró el atributo para actualizar.');

  // Recuperar valores actuales
  const { data: actuales } = await supabase
    .from('atributo_valores')
    .select('*')
    .eq('atributo_id', idLimpio)
    .returns<AtributoValor[]>();

  const actualesMap = new Map((actuales ?? []).map((v) => [v.id, v]));
  const idsPresentes = new Set<string>();

  // Actualizar existentes e insertar nuevos
  for (const item of valoresForm) {
    if (item.id && actualesMap.has(item.id)) {
      idsPresentes.add(item.id);
      const { error: updateError } = await supabase
        .from('atributo_valores')
        .update({ valor: item.valor })
        .eq('id', item.id);
      if (updateError) handleSupabaseError(updateError);
    } else {
      const { data: creado, error: insertError } = await supabase
        .from('atributo_valores')
        .insert({ atributo_id: idLimpio, valor: item.valor })
        .select()
        .single();
      if (insertError) handleSupabaseError(insertError);
      if (creado) idsPresentes.add(creado.id);
    }
  }

  // Eliminar valores quitados (fallará si están en uso por una variante)
  const idsAEliminar =
    actuales?.filter((v) => !idsPresentes.has(v.id)).map((v) => v.id) ?? [];

  if (idsAEliminar.length > 0) {
    const { error: deleteError } = await supabase
      .from('atributo_valores')
      .delete()
      .in('id', idsAEliminar);
    if (deleteError) handleSupabaseError(deleteError);
  }

  return obtenerAtributoConValores(idLimpio);
}

export async function eliminarAtributo(id: string): Promise<void> {
  const idLimpio = validarId(id, 'ID de atributo');

  const { error } = await supabase.from('atributos').delete().eq('id', idLimpio);
  if (error) handleSupabaseError(error);
}

// ------------------------------------------------------------------
// Productos y asignación dinámica de atributos
// ------------------------------------------------------------------

export async function listarProductos(): Promise<ProductoListado[]> {
  const { data, error } = await supabase
    .from('productos')
    .select('*, categorias(*), producto_atributos(atributos(*))')
    .order('nombre')
    .returns<ProductoListado[]>();

  if (error) handleSupabaseError(error);
  return data ?? [];
}

export async function obtenerProducto(id: string): Promise<ProductoListado> {
  const idLimpio = validarId(id, 'ID de producto');

  const { data, error } = await supabase
    .from('productos')
    .select('*, categorias(*), producto_atributos(atributos(*))')
    .eq('id', idLimpio)
    .single()
    .returns<ProductoListado>();

  if (error) handleSupabaseError(error);
  if (!data) throw new CatalogoError('No se encontró el producto solicitado.');
  return data;
}

export async function crearProducto(form: ProductoForm): Promise<ProductoListado> {
  const nombre = validarNombre(form.nombre, 'Nombre de producto');
  const atributoIds = validarListaIds(form.atributo_ids, 'Atributos del producto');

  const insertData: ProductoInsert = {
    nombre,
    categoria_id: form.categoria_id ?? null,
    activo: form.activo ?? true,
  };

  const { data: producto, error } = await supabase
    .from('productos')
    .insert(insertData)
    .select()
    .single();

  if (error) handleSupabaseError(error);
  if (!producto) throw new CatalogoError('No se pudo crear el producto.');

  try {
    await asignarAtributosAProducto(producto.id, atributoIds);
  } catch (err) {
    // Rollback manual si falla la asignación de atributos
    await supabase.from('productos').delete().eq('id', producto.id);
    throw err;
  }

  return obtenerProducto(producto.id);
}

export async function actualizarProducto(
  id: string,
  form: ProductoForm
): Promise<ProductoListado> {
  const idLimpio = validarId(id, 'ID de producto');
  const nombre = validarNombre(form.nombre, 'Nombre de producto');
  const atributoIds = validarListaIds(form.atributo_ids, 'Atributos del producto');

  const updateData: ProductoUpdate = {
    nombre,
    categoria_id: form.categoria_id ?? null,
  };

  if (typeof form.activo === 'boolean') {
    updateData.activo = form.activo;
  }

  const { data: producto, error } = await supabase
    .from('productos')
    .update(updateData)
    .eq('id', idLimpio)
    .select()
    .single();

  if (error) handleSupabaseError(error);
  if (!producto) throw new CatalogoError('No se encontró el producto para actualizar.');

  await reemplazarAtributosDeProducto(idLimpio, atributoIds);

  return obtenerProducto(idLimpio);
}

export async function eliminarProducto(id: string): Promise<void> {
  const idLimpio = validarId(id, 'ID de producto');

  const { error } = await supabase.from('productos').delete().eq('id', idLimpio);
  if (error) handleSupabaseError(error);
}

// ------------------------------------------------------------------
// Variantes y combinaciones de valores de atributos
// ------------------------------------------------------------------

export async function listarVariantesPorProducto(
  productoId: string
): Promise<VarianteListado[]> {
  const idLimpio = validarId(productoId, 'ID de producto');

  const { data, error } = await supabase
    .from('variantes')
    .select('*, variante_atributos(atributo_valores(*))')
    .eq('producto_id', idLimpio)
    .order('sku', { ascending: true, nullsFirst: false })
    .returns<VarianteListado[]>();

  if (error) handleSupabaseError(error);
  return data ?? [];
}

export async function obtenerVariante(id: string): Promise<VarianteListado> {
  const idLimpio = validarId(id, 'ID de variante');

  const { data, error } = await supabase
    .from('variantes')
    .select('*, variante_atributos(atributo_valores(*))')
    .eq('id', idLimpio)
    .single()
    .returns<VarianteListado>();

  if (error) handleSupabaseError(error);
  if (!data) throw new CatalogoError('No se encontró la variante solicitada.');
  return data;
}

export async function crearVariante(form: VarianteForm): Promise<VarianteListado> {
  const productoId = validarId(form.producto_id, 'ID de producto');
  const costoUsd = validarMontoPositivo(form.costo_usd, 'Costo en USD');
  const stockCentral = validarOpcionalMontoNoNegativo(
    form.stock_central ?? 0,
    'Stock central'
  );
  const sku = validarSku(form.sku);
  const atributoValorIds = validarListaIds(
    form.atributo_valor_ids,
    'Valores de atributos de la variante'
  );

  const insertData: VarianteInsert = {
    producto_id: productoId,
    sku,
    costo_usd: costoUsd,
    stock_central: stockCentral,
    activo: form.activo ?? true,
  };

  const { data: variante, error } = await supabase
    .from('variantes')
    .insert(insertData)
    .select()
    .single();

  if (error) handleSupabaseError(error);
  if (!variante) throw new CatalogoError('No se pudo crear la variante.');

  try {
    await asignarAtributosAVariante(variante.id, atributoValorIds);
  } catch (err) {
    await supabase.from('variantes').delete().eq('id', variante.id);
    throw err;
  }

  return obtenerVariante(variante.id);
}

export async function actualizarVariante(
  id: string,
  form: VarianteUpdateForm
): Promise<VarianteListado> {
  const idLimpio = validarId(id, 'ID de variante');

  const updateData: VarianteUpdate = {};

  if (form.sku !== undefined) {
    updateData.sku = validarSku(form.sku);
  }
  if (form.costo_usd !== undefined) {
    updateData.costo_usd = validarMontoPositivo(form.costo_usd, 'Costo en USD');
  }
  if (form.stock_central !== undefined) {
    updateData.stock_central = validarOpcionalMontoNoNegativo(
      form.stock_central,
      'Stock central'
    );
  }
  if (typeof form.activo === 'boolean') {
    updateData.activo = form.activo;
  }

  const { data: variante, error } = await supabase
    .from('variantes')
    .update(updateData)
    .eq('id', idLimpio)
    .select()
    .single();

  if (error) handleSupabaseError(error);
  if (!variante) throw new CatalogoError('No se encontró la variante para actualizar.');

  if (form.atributo_valor_ids !== undefined) {
    const atributoValorIds = validarListaIds(
      form.atributo_valor_ids,
      'Valores de atributos de la variante'
    );
    await reemplazarAtributosDeVariante(idLimpio, atributoValorIds);
  }

  return obtenerVariante(idLimpio);
}

export async function eliminarVariante(id: string): Promise<void> {
  const idLimpio = validarId(id, 'ID de variante');

  const { error } = await supabase.from('variantes').delete().eq('id', idLimpio);
  if (error) handleSupabaseError(error);
}

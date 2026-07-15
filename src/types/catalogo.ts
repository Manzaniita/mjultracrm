import type { Database } from './database.types';

// ------------------------------------------------------------------
// Tipos base extraídos del schema
// ------------------------------------------------------------------

export type Perfil = Database['public']['Tables']['perfiles']['Row'];
export type Categoria = Database['public']['Tables']['categorias']['Row'];
export type Atributo = Database['public']['Tables']['atributos']['Row'];
export type AtributoValor = Database['public']['Tables']['atributo_valores']['Row'];
export type Producto = Database['public']['Tables']['productos']['Row'];
export type ProductoAtributo = Database['public']['Tables']['producto_atributos']['Row'];
export type Variante = Database['public']['Tables']['variantes']['Row'];
export type VarianteAtributo = Database['public']['Tables']['variante_atributos']['Row'];
export type ListaPrecio = Database['public']['Tables']['listas_precios']['Row'];

// ------------------------------------------------------------------
// Tipos compuestos para uso en la UI y servicios
// ------------------------------------------------------------------

/** Atributo con sus valores posibles (usado para selects dinámicos). */
export type AtributoConValores = Atributo & {
  atributo_valores: AtributoValor[];
};

/** Producto con los IDs de atributos que utiliza. */
export type ProductoConAtributos = Producto & {
  atributos: Atributo[];
  producto_atributos: ProductoAtributo[];
};

/** Variante con los valores de atributos que la conforman. */
export type VarianteConAtributos = Variante & {
  atributos: AtributoValor[];
  variante_atributos: VarianteAtributo[];
};

// ------------------------------------------------------------------
// Inputs de formularios / servicios
// ------------------------------------------------------------------

export interface CategoriaForm {
  nombre: string;
}

export interface AtributoValorForm {
  /** ID opcional: si viene, se actualiza; si no, se crea. */
  id?: string;
  valor: string;
}

export interface AtributoForm {
  nombre: string;
  valores: AtributoValorForm[];
}

export interface ProductoForm {
  nombre: string;
  categoria_id?: string | null;
  /** IDs de atributos dinámicos que el producto utiliza. */
  atributo_ids: string[];
  activo?: boolean;
}

export interface VarianteForm {
  producto_id: string;
  sku?: string | null;
  costo_usd: number;
  stock_central?: number;
  /** IDs de valores de atributos que definen esta variante. */
  atributo_valor_ids: string[];
  activo?: boolean;
}

export interface VarianteUpdateForm {
  sku?: string | null;
  costo_usd?: number;
  stock_central?: number;
  atributo_valor_ids?: string[];
  activo?: boolean;
}

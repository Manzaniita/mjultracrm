import type {
  ListaPrecioRow,
  PrecioRow,
  ProductoRow,
  TipoCambioRow,
  VarianteRow,
} from './database.types';

// ------------------------------------------------------------------
// Tipos compuestos para precios
// ------------------------------------------------------------------

/** Variante con su producto y los precios guardados por lista. */
export type VarianteConPrecios = VarianteRow & {
  productos: ProductoRow | null;
  precios: (PrecioRow & { listas_precios: ListaPrecioRow })[];
};

/** Representación de un precio por lista para la UI. */
export type PrecioPorLista = {
  lista: ListaPrecioRow;
  precio: PrecioRow | null;
  /** Precio calculado automáticamente según costo + margen + TC vigente. */
  precioCalculado: number;
};

// ------------------------------------------------------------------
// Inputs de formularios
// ------------------------------------------------------------------

export interface CargarTipoCambioForm {
  valor: number;
}

export interface OverridePrecioForm {
  variante_id: string;
  lista_id: string;
  precio_ars: number;
}

export interface EdicionMasivaForm {
  lista_id: string;
  costo_usd: number;
  precio_ars: number;
}

export interface SimularVentaForm {
  variante_id: string;
  cantidad: number;
  lista_id: string;
}

export interface VentaSimulacion {
  variante: VarianteRow;
  lista: ListaPrecioRow;
  cantidad: number;
  precio_unit_ars: number;
  precio_manual: boolean;
  total_ars: number;
  tc_usado: number;
  total_usd: number;
}

export type { ListaPrecioRow, PrecioRow, TipoCambioRow };

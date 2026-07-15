/**
 * Tipos de base de datos generados manualmente a partir del schema MJUltraCRM.
 * Refleja las tablas, columnas, constraints y enums definidos en el script SQL.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

// ------------------------------------------------------------------
// Enums del schema
// ------------------------------------------------------------------

export type Rol = 'admin' | 'reventa';

export type EstadoPedidoReposicion =
  | 'pendiente'
  | 'aprobado'
  | 'aprobado_parcial'
  | 'rechazado';

export type EstadoConsignacion = 'activa' | 'anulada' | 'devuelta';

export type TipoMovimientoStock =
  | 'compra'
  | 'consignacion'
  | 'devolucion_consignacion'
  | 'venta'
  | 'ajuste';

export type MetodoPago = 'efectivo' | 'transferencia';

export type EstadoCobro = 'pendiente' | 'parcial' | 'pagada' | 'anulada';

export type TipoCajaMovimiento = 'ingreso' | 'egreso' | 'gasto';

export type TipoReferenciaCaja =
  | 'venta'
  | 'pago'
  | 'consignacion'
  | 'arqueo'
  | 'manual';

// ------------------------------------------------------------------
// Tablas base (Fase 1)
// ------------------------------------------------------------------

export type PerfilRow = {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  telefono: string | null;
  direccion: string | null;
  created_at: string;
  updated_at: string;
};

export type PerfilInsert = {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo?: boolean;
  telefono?: string | null;
  direccion?: string | null;
};

export type PerfilUpdate = {
  nombre?: string;
  email?: string;
  rol?: Rol;
  activo?: boolean;
  telefono?: string | null;
  direccion?: string | null;
  updated_at?: string;
};

export type CategoriaRow = {
  id: string;
  nombre: string;
  created_at: string;
  updated_at: string;
};

export type CategoriaInsert = {
  id?: string;
  nombre: string;
};

export type CategoriaUpdate = {
  nombre?: string;
  updated_at?: string;
};

export type AtributoRow = {
  id: string;
  nombre: string;
  created_at: string;
  updated_at: string;
};

export type AtributoInsert = {
  id?: string;
  nombre: string;
};

export type AtributoUpdate = {
  nombre?: string;
  updated_at?: string;
};

export type AtributoValorRow = {
  id: string;
  atributo_id: string;
  valor: string;
  created_at: string;
  updated_at: string;
};

export type AtributoValorInsert = {
  id?: string;
  atributo_id: string;
  valor: string;
};

export type AtributoValorUpdate = {
  atributo_id?: string;
  valor?: string;
  updated_at?: string;
};

export type ProductoRow = {
  id: string;
  nombre: string;
  categoria_id: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductoInsert = {
  id?: string;
  nombre: string;
  categoria_id?: string | null;
  activo?: boolean;
};

export type ProductoUpdate = {
  nombre?: string;
  categoria_id?: string | null;
  activo?: boolean;
  updated_at?: string;
};

export type ProductoAtributoRow = {
  producto_id: string;
  atributo_id: string;
};

export type ProductoAtributoInsert = {
  producto_id: string;
  atributo_id: string;
};

export type ProductoAtributoUpdate = {
  producto_id?: string;
  atributo_id?: string;
};

export type VarianteRow = {
  id: string;
  producto_id: string;
  sku: string | null;
  costo_usd: number;
  stock_central: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type VarianteInsert = {
  id?: string;
  producto_id: string;
  sku?: string | null;
  costo_usd: number;
  stock_central?: number;
  activo?: boolean;
};

export type VarianteUpdate = {
  producto_id?: string;
  sku?: string | null;
  costo_usd?: number;
  stock_central?: number;
  activo?: boolean;
  updated_at?: string;
};

export type VarianteAtributoRow = {
  variante_id: string;
  atributo_valor_id: string;
};

export type VarianteAtributoInsert = {
  variante_id: string;
  atributo_valor_id: string;
};

export type VarianteAtributoUpdate = {
  variante_id?: string;
  atributo_valor_id?: string;
};

export type CostoHistorialRow = {
  id: string;
  variante_id: string;
  costo_usd: number;
  fecha: string;
  usuario_id: string;
};

export type CostoHistorialInsert = {
  id?: string;
  variante_id: string;
  costo_usd: number;
  fecha?: string;
  usuario_id: string;
};

export type CostoHistorialUpdate = {
  variante_id?: string;
  costo_usd?: number;
  fecha?: string;
  usuario_id?: string;
};

export type ListaPrecioRow = {
  id: string;
  nombre: string;
  margen: number;
  created_at: string;
  updated_at: string;
};

export type ListaPrecioInsert = {
  id?: string;
  nombre: string;
  margen: number;
};

export type ListaPrecioUpdate = {
  nombre?: string;
  margen?: number;
  updated_at?: string;
};

export type PrecioRow = {
  id: string;
  variante_id: string;
  lista_id: string;
  precio_ars: number;
  es_manual: boolean;
  fecha: string;
  created_at: string;
  updated_at: string;
};

export type PrecioInsert = {
  id?: string;
  variante_id: string;
  lista_id: string;
  precio_ars: number;
  es_manual?: boolean;
  fecha?: string;
};

export type PrecioUpdate = {
  variante_id?: string;
  lista_id?: string;
  precio_ars?: number;
  es_manual?: boolean;
  fecha?: string;
  updated_at?: string;
};

export type TipoCambioRow = {
  id: string;
  valor: number;
  fecha: string;
  usuario_id: string;
};

export type TipoCambioInsert = {
  id?: string;
  valor: number;
  fecha?: string;
  usuario_id: string;
};

export type TipoCambioUpdate = {
  valor?: number;
  fecha?: string;
  usuario_id?: string;
};

// ------------------------------------------------------------------
// Tablas de consignación y stock (Fase 2)
// ------------------------------------------------------------------

export type PedidoReposicionRow = {
  id: string;
  reventa_id: string;
  estado: EstadoPedidoReposicion;
  motivo_rechazo: string | null;
  usuario_id: string;
  created_at: string;
  updated_at: string;
};

export type PedidoReposicionInsert = {
  id?: string;
  reventa_id: string;
  estado?: EstadoPedidoReposicion;
  motivo_rechazo?: string | null;
  usuario_id: string;
};

export type PedidoReposicionUpdate = {
  reventa_id?: string;
  estado?: EstadoPedidoReposicion;
  motivo_rechazo?: string | null;
  usuario_id?: string;
  updated_at?: string;
};

export type PedidoReposicionLineaRow = {
  id: string;
  pedido_id: string;
  variante_id: string;
  cantidad_solicitada: number;
  cantidad_aprobada: number | null;
};

export type PedidoReposicionLineaInsert = {
  id?: string;
  pedido_id: string;
  variante_id: string;
  cantidad_solicitada: number;
  cantidad_aprobada?: number | null;
};

export type PedidoReposicionLineaUpdate = {
  pedido_id?: string;
  variante_id?: string;
  cantidad_solicitada?: number;
  cantidad_aprobada?: number | null;
};

export type ConsignacionRow = {
  id: string;
  reventa_id: string;
  pedido_reposicion_id: string | null;
  fecha: string;
  estado: EstadoConsignacion;
  motivo_anulacion: string | null;
  usuario_id: string;
  created_at: string;
  updated_at: string;
};

export type ConsignacionInsert = {
  id?: string;
  reventa_id: string;
  pedido_reposicion_id?: string | null;
  fecha?: string;
  estado?: EstadoConsignacion;
  motivo_anulacion?: string | null;
  usuario_id: string;
};

export type ConsignacionUpdate = {
  reventa_id?: string;
  pedido_reposicion_id?: string | null;
  fecha?: string;
  estado?: EstadoConsignacion;
  motivo_anulacion?: string | null;
  usuario_id?: string;
  updated_at?: string;
};

export type ConsignacionLineaRow = {
  id: string;
  consignacion_id: string;
  variante_id: string;
  cantidad: number;
};

export type ConsignacionLineaInsert = {
  id?: string;
  consignacion_id: string;
  variante_id: string;
  cantidad: number;
};

export type ConsignacionLineaUpdate = {
  consignacion_id?: string;
  variante_id?: string;
  cantidad?: number;
};

export type StockConsignadoRow = {
  variante_id: string;
  reventa_id: string;
  cantidad: number;
};

export type StockConsignadoInsert = {
  variante_id: string;
  reventa_id: string;
  cantidad?: number;
};

export type StockConsignadoUpdate = {
  variante_id?: string;
  reventa_id?: string;
  cantidad?: number;
};

export type MovimientoStockRow = {
  id: string;
  tipo: TipoMovimientoStock;
  variante_id: string;
  cantidad: number;
  reventa_origen_id: string | null;
  reventa_destino_id: string | null;
  referencia_tipo: TipoReferenciaCaja | null;
  referencia_id: string | null;
  motivo: string | null;
  usuario_id: string;
  created_at: string;
};

export type MovimientoStockInsert = {
  id?: string;
  tipo: TipoMovimientoStock;
  variante_id: string;
  cantidad: number;
  reventa_origen_id?: string | null;
  reventa_destino_id?: string | null;
  referencia_tipo?: TipoReferenciaCaja | null;
  referencia_id?: string | null;
  motivo?: string | null;
  usuario_id: string;
};

export type MovimientoStockUpdate = {
  tipo?: TipoMovimientoStock;
  variante_id?: string;
  cantidad?: number;
  reventa_origen_id?: string | null;
  reventa_destino_id?: string | null;
  referencia_tipo?: TipoReferenciaCaja | null;
  referencia_id?: string | null;
  motivo?: string | null;
  usuario_id?: string;
};

// ------------------------------------------------------------------
// Tablas de ventas, pagos y deudas (Fase 3)
// ------------------------------------------------------------------

export type VentaRow = {
  id: string;
  fecha: string;
  usuario_id: string;
  reventa_id: string | null;
  lista_id: string;
  total_ars: number;
  tc_usado: number;
  total_usd: number;
  estado_cobro: EstadoCobro;
  anulada: boolean;
  motivo_anulacion: string | null;
  created_at: string;
  updated_at: string;
};

export type VentaInsert = {
  id?: string;
  fecha?: string;
  usuario_id: string;
  reventa_id?: string | null;
  lista_id: string;
  total_ars: number;
  tc_usado: number;
  total_usd: number;
  estado_cobro?: EstadoCobro;
  anulada?: boolean;
  motivo_anulacion?: string | null;
};

export type VentaUpdate = {
  fecha?: string;
  usuario_id?: string;
  reventa_id?: string | null;
  lista_id?: string;
  total_ars?: number;
  tc_usado?: number;
  total_usd?: number;
  estado_cobro?: EstadoCobro;
  anulada?: boolean;
  motivo_anulacion?: string | null;
  updated_at?: string;
};

export type VentaLineaRow = {
  id: string;
  venta_id: string;
  variante_id: string;
  cantidad: number;
  precio_unit_ars: number;
  precio_manual: boolean;
  total_linea_ars: number;
};

export type VentaLineaInsert = {
  id?: string;
  venta_id: string;
  variante_id: string;
  cantidad: number;
  precio_unit_ars: number;
  precio_manual?: boolean;
};

export type VentaLineaUpdate = {
  venta_id?: string;
  variante_id?: string;
  cantidad?: number;
  precio_unit_ars?: number;
  precio_manual?: boolean;
};

export type PagoRow = {
  id: string;
  venta_id: string;
  monto_ars: number;
  metodo: MetodoPago;
  fecha: string;
  usuario_id: string;
  comprobante_url: string | null;
  created_at: string;
};

export type PagoInsert = {
  id?: string;
  venta_id: string;
  monto_ars: number;
  metodo: MetodoPago;
  fecha?: string;
  usuario_id: string;
  comprobante_url?: string | null;
};

export type PagoUpdate = {
  venta_id?: string;
  monto_ars?: number;
  metodo?: MetodoPago;
  fecha?: string;
  usuario_id?: string;
  comprobante_url?: string | null;
};

// ------------------------------------------------------------------
// Tablas de caja y arqueo (Fase 4)
// ------------------------------------------------------------------

export type CajaMovimientoRow = {
  id: string;
  tipo: TipoCajaMovimiento;
  monto_ars: number;
  metodo: MetodoPago;
  motivo: string;
  usuario_id: string;
  referencia_tipo: TipoReferenciaCaja | null;
  referencia_id: string | null;
  created_at: string;
};

export type CajaMovimientoInsert = {
  id?: string;
  tipo: TipoCajaMovimiento;
  monto_ars: number;
  metodo: MetodoPago;
  motivo: string;
  usuario_id: string;
  referencia_tipo?: TipoReferenciaCaja | null;
  referencia_id?: string | null;
};

export type CajaMovimientoUpdate = {
  tipo?: TipoCajaMovimiento;
  monto_ars?: number;
  metodo?: MetodoPago;
  motivo?: string;
  usuario_id?: string;
  referencia_tipo?: TipoReferenciaCaja | null;
  referencia_id?: string | null;
};

export type ArqueoRow = {
  id: string;
  fecha: string;
  usuario_id: string;
  observaciones: string | null;
  created_at: string;
};

export type ArqueoInsert = {
  id?: string;
  fecha?: string;
  usuario_id: string;
  observaciones?: string | null;
};

export type ArqueoUpdate = {
  fecha?: string;
  usuario_id?: string;
  observaciones?: string | null;
};

export type ArqueoSaldoRow = {
  id: string;
  arqueo_id: string;
  metodo: MetodoPago;
  saldo_teorico: number;
  saldo_real: number;
  diferencia: number;
};

export type ArqueoSaldoInsert = {
  id?: string;
  arqueo_id: string;
  metodo: MetodoPago;
  saldo_teorico: number;
  saldo_real: number;
  diferencia: number;
};

export type ArqueoSaldoUpdate = {
  arqueo_id?: string;
  metodo?: MetodoPago;
  saldo_teorico?: number;
  saldo_real?: number;
  diferencia?: number;
};

// ------------------------------------------------------------------
// Database interface (estilo supabase-js)
// ------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      perfiles: { Row: PerfilRow; Insert: PerfilInsert; Update: PerfilUpdate; Relationships: never[] };
      categorias: { Row: CategoriaRow; Insert: CategoriaInsert; Update: CategoriaUpdate; Relationships: never[] };
      atributos: { Row: AtributoRow; Insert: AtributoInsert; Update: AtributoUpdate; Relationships: never[] };
      atributo_valores: {
        Row: AtributoValorRow;
        Insert: AtributoValorInsert;
        Update: AtributoValorUpdate;
        Relationships: never[];
      };
      productos: { Row: ProductoRow; Insert: ProductoInsert; Update: ProductoUpdate; Relationships: never[] };
      producto_atributos: {
        Row: ProductoAtributoRow;
        Insert: ProductoAtributoInsert;
        Update: ProductoAtributoUpdate;
        Relationships: never[];
      };
      variantes: { Row: VarianteRow; Insert: VarianteInsert; Update: VarianteUpdate; Relationships: never[] };
      variante_atributos: {
        Row: VarianteAtributoRow;
        Insert: VarianteAtributoInsert;
        Update: VarianteAtributoUpdate;
        Relationships: never[];
      };
      costos_historial: {
        Row: CostoHistorialRow;
        Insert: CostoHistorialInsert;
        Update: CostoHistorialUpdate;
        Relationships: never[];
      };
      listas_precios: {
        Row: ListaPrecioRow;
        Insert: ListaPrecioInsert;
        Update: ListaPrecioUpdate;
        Relationships: never[];
      };
      precios: { Row: PrecioRow; Insert: PrecioInsert; Update: PrecioUpdate; Relationships: never[] };
      tipos_cambio: {
        Row: TipoCambioRow;
        Insert: TipoCambioInsert;
        Update: TipoCambioUpdate;
        Relationships: never[];
      };
      pedidos_reposicion: {
        Row: PedidoReposicionRow;
        Insert: PedidoReposicionInsert;
        Update: PedidoReposicionUpdate;
        Relationships: never[];
      };
      pedido_reposicion_lineas: {
        Row: PedidoReposicionLineaRow;
        Insert: PedidoReposicionLineaInsert;
        Update: PedidoReposicionLineaUpdate;
        Relationships: never[];
      };
      consignaciones: {
        Row: ConsignacionRow;
        Insert: ConsignacionInsert;
        Update: ConsignacionUpdate;
        Relationships: never[];
      };
      consignacion_lineas: {
        Row: ConsignacionLineaRow;
        Insert: ConsignacionLineaInsert;
        Update: ConsignacionLineaUpdate;
        Relationships: never[];
      };
      stock_consignado: {
        Row: StockConsignadoRow;
        Insert: StockConsignadoInsert;
        Update: StockConsignadoUpdate;
        Relationships: never[];
      };
      movimientos_stock: {
        Row: MovimientoStockRow;
        Insert: MovimientoStockInsert;
        Update: MovimientoStockUpdate;
        Relationships: never[];
      };
      ventas: { Row: VentaRow; Insert: VentaInsert; Update: VentaUpdate; Relationships: never[] };
      venta_lineas: {
        Row: VentaLineaRow;
        Insert: VentaLineaInsert;
        Update: VentaLineaUpdate;
        Relationships: never[];
      };
      pagos: { Row: PagoRow; Insert: PagoInsert; Update: PagoUpdate; Relationships: never[] };
      caja_movimientos: {
        Row: CajaMovimientoRow;
        Insert: CajaMovimientoInsert;
        Update: CajaMovimientoUpdate;
        Relationships: never[];
      };
      arqueos: { Row: ArqueoRow; Insert: ArqueoInsert; Update: ArqueoUpdate; Relationships: never[] };
      arqueo_saldos: {
        Row: ArqueoSaldoRow;
        Insert: ArqueoSaldoInsert;
        Update: ArqueoSaldoUpdate;
        Relationships: never[];
      };
    };
    Views: {
      [_ in string]: never;
    };
    Functions: {
      crear_consignacion: {
        Args: {
          p_reventa_id: string;
          p_pedido_reposicion_id: string | null;
          p_lineas: string;
          p_usuario_id: string;
        };
        Returns: string;
      };
      aprobar_pedido_reposicion: {
        Args: {
          p_pedido_id: string;
          p_usuario_id: string;
        };
        Returns: string;
      };
      anular_venta: {
        Args: {
          p_venta_id: string;
          p_motivo: string;
          p_usuario_id: string;
        };
        Returns: void;
      };
    };
    Enums: {
      [_ in string]: never;
    };
  };
}

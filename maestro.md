# MJ GESTIÓN — Documento Maestro del Sistema
**Sistema de gestión de stock, consignaciones, ventas y caja para MJ Importaciones**

> Versión 1.0 — Julio 2026
> Nombre provisorio: "MJ Gestión" (a definir)
> Documento de referencia único: toda decisión de desarrollo debe respetar lo que dice acá. Si algo cambia, se actualiza este documento primero.

---

## 1. OBJETIVO

Sistema web (PWA) para administrar de punta a punta el negocio de reventa de MJ Importaciones: **vapers, ropa, celulares y electrónica**.

El problema que resuelve:

- Hoy no hay trazabilidad clara de cuánta mercadería está "en la calle" en consignación con cada reventa.
- No hay un registro confiable de quién debe cuánto, quién pagó, con qué método y con qué comprobante.
- Los precios se manejan a mano y ajustarlos con cada devaluación es un trabajo enorme.
- La inflación del ARS distorsiona los números: no se sabe cuánto se facturó "de verdad".
- No se sabe cuánto dinero debería haber en cada método de pago ni quién registró cada movimiento.

El sistema centraliza catálogo, stock, consignaciones, ventas, cobros, deudas y caja, con un panel para el administrador y un panel restringido para cada reventa.

**No es** (fuera de alcance): tienda online pública, facturación fiscal ARCA/AFIP, gestión de imágenes de productos, caja diaria con apertura/cierre de local.

---

## 2. STACK TÉCNICO

| Capa | Tecnología |
|---|---|
| Frontend | React + TypeScript + Vite, PWA instalable en el celular |
| Backend / DB | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth (email + contraseña) |
| Permisos | Row Level Security (RLS) de PostgreSQL — la seguridad vive en la base de datos, no solo en la UI |
| Archivos | Supabase Storage (comprobantes de pago: imagen o PDF) |
| Hosting frontend | Vercel |

Convenciones de código: comentarios en español, componentes tipados, lógica de negocio en servicios/funciones separadas de la UI.

---

## 3. ROLES Y PERMISOS

Dos roles: **Admin** y **Reventa**.

### Matriz de permisos

| Acción | Admin | Reventa |
|---|:---:|:---:|
| Categorías, atributos, productos, variantes (CRUD) | ✅ | ❌ |
| Ver costos de productos | ✅ | ❌ |
| Editar precios y márgenes | ✅ | ❌ |
| Cargar tipo de cambio | ✅ | ❌ |
| Crear consignaciones | ✅ | ❌ |
| Ver stock central | ✅ | ❌ |
| Ver stock consignado | ✅ (todos) | ✅ (solo el propio) |
| Crear pedido de reposición | ✅ | ✅ (solo propio) |
| Aprobar/rechazar pedidos de reposición | ✅ | ❌ |
| Registrar ventas | ✅ (cualquiera) | ✅ (solo de su stock consignado) |
| Registrar pagos y adjuntar comprobantes | ✅ | ✅ (solo sobre sus ventas) |
| Ver deudas | ✅ (todas) | ✅ (solo la propia) |
| Módulo de caja (movimientos, arqueo, saldos) | ✅ | ❌ |
| Reportes y dashboard global | ✅ | ❌ |
| Gestión de usuarios | ✅ | ❌ |

**Regla de oro:** una reventa jamás puede ver costos, márgenes, datos de otras reventas, la caja global ni los reportes generales. Esto se garantiza con políticas RLS en cada tabla, no solo ocultando botones.

---

## 4. CATÁLOGO

### 4.1 Categorías
- CRUD completo por el admin (crear, editar, eliminar).
- Ejemplos: Vapers, Ropa, Celulares, Electrónica. Pero son datos, no valores fijos del sistema.

### 4.2 Atributos dinámicos
- El admin crea, edita y elimina **atributos** (ej: Sabor, Talle, Color, Capacidad, Modelo) y sus **valores** (ej: Sabor → Grape Ice, Miami Mint; Talle → S, M, L, XL).
- Ningún atributo está hardcodeado. El sistema no sabe qué es un "sabor": solo sabe que existen atributos con valores.
- Un producto define qué atributos usa. No todos los productos usan los mismos.

### 4.3 Productos y variantes
- **Producto** = concepto general (ej: "Elfbar BC5000", "Remera oversize").
- **Variante** = combinación concreta de valores de atributos, con SKU opcional, **costo propio en USD** y **stock propio**.
  - Ej: Elfbar BC5000 / Grape Ice → costo USD 4,50 / stock 32.
  - Ej: Remera oversize / Negro / L → costo USD 6,00 / stock 8.
- Un producto sin atributos tiene una única variante implícita (ej: un celular puntual).
- **Sin imágenes.** El catálogo es texto puro.
- Variantes se pueden desactivar (soft delete) para no romper el historial de ventas.

---

## 5. PRECIOS Y TIPO DE CAMBIO

### 5.1 Costo en USD
- El costo de cada variante se carga y almacena **en USD** (las compras se hacen en USD/USDT).
- El costo puede actualizarse al ingresar nueva mercadería; los cambios de costo quedan en historial.

### 5.2 Listas de precios
Tres listas con margen configurable sobre el costo:

| Lista | Margen por defecto |
|---|---|
| Reventa | +30% |
| Comunidad | +60% |
| Público | +80% |

- Los márgenes son editables por lista (si mañana Reventa pasa a +35%, se cambia en un lugar).
- **Precio automático en ARS** = `costo_usd × tipo_cambio_vigente × (1 + margen)`.
- **Override manual:** el admin puede pisar el precio de cualquier variante en cualquier lista, en cualquier momento, sin importar tipo de cliente ni tipo de venta. El override queda marcado como "precio manual" y no se recalcula automáticamente hasta que el admin lo libere.
- **Edición masiva:** acción "aplicar precio X a todas las variantes con costo Y" para no ir una por una. También: "recalcular todos los precios automáticos con el TC actual".

### 5.3 Tipo de cambio (regla central del sistema)
- El admin carga manualmente la cotización del dólar cuando quiere. Cada carga queda en un **historial** (`fecha`, `valor`).
- El "TC vigente" es siempre el último cargado.
- **Snapshot congelado en cada venta:** al registrar una venta se guardan `total_ars`, `tc_usado` y `total_usd` calculado en ese momento. **Ese valor en USD nunca se recalcula**, aunque el TC cambie después. Las ventas nuevas usan el TC nuevo.
- Propósito: ver la facturación real en USD, sin la distorsión de la inflación del ARS. Los reportes muestran ambas monedas.
- Las ventas siempre se cobran **en ARS**. El USD es solo unidad de medida de valor.

### 5.4 Regla sobre precios de las reventas
Cuando una reventa registra una venta, el monto que le debe al admin se calcula con la **lista Reventa** (o el override manual que tenga esa variante). A cuánto le vendió la reventa a su cliente final es negocio de la reventa y el sistema no lo registra. *(Si más adelante se quiere trackear el precio final de la reventa para estadísticas, se agrega como campo opcional — hoy fuera de alcance.)*

---

## 6. STOCK

### 6.1 Ubicaciones de stock
Cada unidad de cada variante está en uno de dos lugares:
1. **Depósito central** (stock del admin).
2. **En consignación** con una reventa específica.

El sistema siempre puede responder: cuánto hay en total, cuánto en depósito, y cuánto tiene cada reventa en la calle.

### 6.2 Movimientos auditados
Toda variación de stock genera un registro en `movimientos_stock` con: tipo, variante, cantidad, origen/destino, usuario que lo hizo, fecha, y referencia al documento que lo originó.

Tipos de movimiento:
- `compra` — ingreso de mercadería al depósito central (permite actualizar costo USD).
- `consignacion` — depósito → reventa.
- `devolucion_consignacion` — reventa → depósito (mercadería que vuelve).
- `venta` — baja definitiva (desde depósito si vende el admin, desde la consignación si vende la reventa).
- `ajuste` — corrección manual del admin, **siempre con motivo obligatorio**.

**Prohibido** editar cantidades de stock directamente: todo pasa por un movimiento. Sin excepciones.

---

## 7. CONSIGNACIONES

### 7.1 Entrega en consignación (la crea el admin)
1. Admin selecciona reventa y arma las líneas (variante + cantidad).
2. Al confirmar: el stock pasa de depósito central a "en calle con [reventa]" y se generan los movimientos.
3. La reventa ve la mercadería en su panel inmediatamente.

### 7.2 Pedido de reposición (lo crea la reventa)
1. La reventa arma desde su panel un pedido con lo que necesita reponer.
2. El pedido queda en estado **`pendiente`**. **No mueve stock.**
3. El admin lo revisa y puede: **aprobar** (total o modificando cantidades según disponibilidad), o **rechazar** con motivo.
4. **Solo al aprobar** se convierte en consignación y se mueve el stock. **Siempre requiere aprobación del admin, sin excepción.**
5. Estados del pedido: `pendiente` → `aprobado` / `aprobado_parcial` / `rechazado`.

### 7.3 Venta de mercadería consignada
1. La reventa (o el admin en su nombre) registra la venta desde su panel: variante, cantidad.
2. El sistema calcula el total en ARS con la lista Reventa (o override) y congela el snapshot USD.
3. La reventa indica el pago en ese momento:
   - **Pagó todo** → registra método (efectivo/transferencia) y adjunta comprobante si es transferencia.
   - **Pagó parcial** → registra lo pagado; el resto queda como deuda.
   - **No pagó nada** → la venta se crea con deuda por el total.
4. El stock consignado de esa reventa baja automáticamente.

### 7.4 Devoluciones
La reventa puede devolver mercadería consignada que no vendió. El admin registra la devolución y el stock vuelve al depósito central.

---

## 8. VENTAS, PAGOS Y DEUDAS

### 8.1 Ventas
- Cabecera: fecha, usuario que la registró, reventa asociada (si aplica), lista de precios aplicada, `total_ars`, `tc_usado`, `total_usd`, estado de cobro.
- Líneas: variante, cantidad, precio unitario ARS aplicado (con marca de si fue precio de lista o manual).
- El admin puede registrar ventas directas propias (lista Comunidad, Público, o precio manual — el que corresponda según a quién le venda).
- Las ventas no se borran: se **anulan** con motivo, revirtiendo stock y caja.

### 8.2 Pagos
- Un pago siempre referencia una venta: monto ARS, método (**efectivo** o **transferencia** — únicos métodos del sistema), fecha, usuario que lo registró, comprobante adjunto (opcional en efectivo, esperado en transferencia).
- Una venta puede tener N pagos (pagos parciales en distintas fechas).
- Comprobantes se guardan en Supabase Storage y quedan visibles para el admin y para la reventa dueña de la venta.

### 8.3 Deudas
- **La deuda no es una tabla: se deriva.** Deuda de una venta = `total_ars − suma(pagos)`. Deuda de una reventa = suma de deudas de sus ventas. Así nunca se desincroniza.
- **Las deudas no vencen.** No hay fecha límite ni alertas de vencimiento: quedan siempre visibles hasta que se salden por completo.
- Panel de la reventa: deuda total actual, detalle por venta, historial de pagos.
- Panel del admin: ranking de deudores, deuda total en la calle, detalle por reventa.
- Un pago posterior se aplica contra una venta específica (la reventa elige cuál salda).

---

## 9. CAJA (POR PEDIDO, NO DIARIA)

No hay local ni apertura/cierre diario. La caja es un **libro de movimientos continuo**, organizado por operación.

### 9.1 Movimientos
Cada movimiento registra: tipo (`ingreso` / `egreso` / `gasto`), monto ARS, método (efectivo o transferencia), **motivo obligatorio**, usuario que lo registró, fecha, y referencia opcional a la venta/pago/consignación que lo originó.

- Los **ingresos por pagos de ventas se generan automáticamente** al registrar el pago (no se cargan dos veces).
- Egresos y gastos los carga el admin a mano (ej: compra de mercadería, envíos, comisiones).

### 9.2 Saldos por método
El sistema muestra en todo momento el **saldo teórico** de cada método: cuánto debería haber en efectivo y cuánto en transferencia, según todos los movimientos registrados.

### 9.3 Arqueo
Cuando el admin quiere, hace un arqueo: ingresa cuánto hay realmente en cada método, el sistema compara contra el teórico y registra la diferencia como movimiento de ajuste **con motivo obligatorio**. Queda historial de arqueos.

### 9.4 Trazabilidad
Toda la caja es filtrable por: usuario ("quién registró qué venta y cuánto dinero ingresó"), método, tipo, rango de fechas, y reventa asociada.

---

## 10. MODELO DE DATOS (resumen de tablas)

| Tabla | Contenido clave |
|---|---|
| `perfiles` | usuario, nombre, rol (`admin` / `reventa`), activo |
| `categorias` | nombre |
| `atributos` | nombre (Sabor, Talle...) |
| `atributo_valores` | atributo_id, valor |
| `productos` | nombre, categoria_id, atributos que usa, activo |
| `variantes` | producto_id, combinación de valores, SKU, `costo_usd`, activo |
| `costos_historial` | variante_id, costo_usd, fecha, usuario |
| `listas_precios` | nombre, margen |
| `precios` | variante_id, lista_id, precio_ars, `es_manual`, fecha |
| `tipos_cambio` | valor, fecha, usuario |
| `consignaciones` | reventa_id, fecha, estado + líneas (variante, cantidad) |
| `pedidos_reposicion` | reventa_id, estado, motivo_rechazo + líneas |
| `ventas` | fecha, usuario, reventa_id (nullable), lista_id, total_ars, tc_usado, total_usd, estado, anulada |
| `venta_lineas` | venta_id, variante_id, cantidad, precio_unit_ars, precio_manual |
| `pagos` | venta_id, monto_ars, metodo, fecha, usuario, comprobante_url |
| `movimientos_stock` | tipo, variante_id, cantidad, ubicación origen/destino, usuario, referencia |
| `caja_movimientos` | tipo, monto_ars, metodo, motivo, usuario, referencia |
| `arqueos` | fecha, saldos teóricos, saldos reales, diferencias, usuario |

*(El esquema SQL completo con tipos, constraints, índices y políticas RLS se genera en la Fase 1.)*

---

## 11. REGLAS DE NEGOCIO (resumen no negociable)

1. Las ventas son **siempre en ARS**. El USD es unidad de medida, con snapshot congelado por venta.
2. El costo se carga **en USD**; los precios ARS se recalculan con el TC vigente, salvo overrides manuales.
3. El admin puede **editar cualquier precio, de cualquier variante, en cualquier momento**, sin importar tipo de cliente ni de venta.
4. Márgenes por defecto: Reventa +30%, Comunidad +60%, Público +80% (configurables).
5. Métodos de pago: **efectivo y transferencia**, nada más.
6. Todo pedido de reposición **requiere aprobación del admin**, siempre.
7. Las deudas **no vencen**: visibles hasta saldarse.
8. Todo movimiento de stock y de caja queda **auditado** (usuario + fecha + motivo/referencia). Nada se edita en crudo.
9. Ventas y consignaciones **no se borran**: se anulan con motivo y reversión.
10. Una reventa solo ve **lo suyo**: su stock, sus ventas, sus pagos, su deuda. Garantizado por RLS.
11. Sin imágenes de productos.
12. Comprobantes de pago adjuntables (imagen/PDF) en Storage.

---

## 12. PANTALLAS PRINCIPALES

### Panel Admin
- **Dashboard**: facturación ARS y USD (mes/histórico), deuda total en la calle, stock valorizado, pedidos de reposición pendientes, últimos movimientos.
- **Catálogo**: categorías, atributos, productos, variantes, edición masiva de precios.
- **Tipo de cambio**: carga rápida + historial.
- **Consignaciones**: crear entrega, ver stock por reventa, devoluciones.
- **Pedidos de reposición**: bandeja de pendientes con aprobar/modificar/rechazar.
- **Ventas**: listado global con filtros, registrar venta directa, anular.
- **Deudas**: ranking de deudores, detalle por reventa, registrar cobro.
- **Caja**: movimientos, saldos por método, cargar egreso/gasto, arqueo.
- **Usuarios**: alta/baja de reventas.

### Panel Reventa
- **Mi stock**: qué mercadería consignada tiene y cuánta.
- **Registrar venta**: seleccionar variante de su stock, cantidad, pago (total/parcial/nada), método, comprobante.
- **Pedido de reposición**: armar y enviar; ver estado de pedidos anteriores.
- **Mi deuda**: total, detalle por venta, historial de pagos, subir comprobante.

---

## 13. FASES DE DESARROLLO

| Fase | Entregable |
|---|---|
| **1 — Base** | Proyecto + Supabase, auth y roles con RLS, categorías, atributos dinámicos, productos/variantes con costo USD, listas de precios con márgenes y override manual, edición masiva, carga de TC con historial |
| **2 — Consignación** | Stock central vs consignado, movimientos auditados, crear consignaciones, devoluciones, pedidos de reposición con aprobación, panel reventa (mi stock + pedidos) |
| **3 — Ventas y cobros** | Registro de ventas (admin y reventa), snapshot USD, pagos parciales, comprobantes en Storage, deudas derivadas, panel de deudores |
| **4 — Caja y reportes** | Movimientos de caja, ingresos automáticos por pagos, egresos/gastos, saldos por método, arqueos, dashboard con reportes ARS/USD |
| **5 — Extras (opcional)** | Bot de Telegram para registrar ventas por voz/texto, generador de mensaje de stock para WhatsApp, export a Excel |

Cada fase termina con el sistema **usable en producción** para lo que cubre.

---

## 14. DECISIONES YA TOMADAS (registro)

| # | Decisión |
|---|---|
| 1 | Usuarios: admin + reventas con paneles separados y permisos estrictos |
| 2 | Atributos y categorías 100% dinámicos, editables por el admin |
| 3 | Precios por margen (+30/+60/+80) con override manual y edición masiva |
| 4 | Ventas en ARS con snapshot USD congelado por venta; TC cargado a mano |
| 5 | Caja por pedido (no diaria): movimientos, saldos por método, arqueo, trazabilidad por usuario |
| 6 | Flujo consignación: entrega → venta de la reventa → pago total/parcial/nada → deuda automática |
| 7 | Métodos de pago: efectivo y transferencia |
| 8 | Sin imágenes; rubros: vapers, ropa, celulares, electrónica |
| 9 | Costo en USD con recálculo automático de precios ARS al actualizar TC |
| 10 | Sistema nuevo desde cero (no es evolución de MJ Assist) |
| 11 | Lista Reventa única para todas las reventas, siempre editable a mano por el admin |
| 12 | Pedidos de reposición siempre con aprobación del admin |
| 13 | Deudas sin vencimiento, visibles hasta saldarse |

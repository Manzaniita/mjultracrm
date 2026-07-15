import * as React from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Loader } from '@/components/ui/Loader';
import { obtenerMiStock } from '@/services/consignacionesService';
import { obtenerTipoCambioVigente } from '@/services/preciosService';
import { simularVenta, registrarVentaReventa } from '@/services/ventasService';
import type { StockConsignadoConDetalle } from '@/services/consignacionesService';
import type { VentaSimulacion } from '@/types/precios';

function formatArs(valor: number): string {
  return `$${valor.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function RegistrarVentaPage() {
  const [stock, setStock] = React.useState<StockConsignadoConDetalle[]>([]);
  const [tcVigente, setTcVigente] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [procesando, setProcesando] = React.useState(false);

  const [varianteId, setVarianteId] = React.useState('');
  const [cantidad, setCantidad] = React.useState('1');
  const [metodoPago, setMetodoPago] = React.useState<'efectivo' | 'transferencia' | ''>('');
  const [montoPagado, setMontoPagado] = React.useState('');
  const [simulacion, setSimulacion] = React.useState<VentaSimulacion | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [exito, setExito] = React.useState<string | null>(null);

  const cargar = React.useCallback(async () => {
    setLoading(true);
    const [s, tc] = await Promise.all([
      obtenerMiStock(),
      obtenerTipoCambioVigente().catch(() => null),
    ]);
    setStock(s);
    setTcVigente(tc);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    cargar();
  }, [cargar]);

  const handleSimular = async () => {
    setError(null);
    setExito(null);
    setSimulacion(null);

    if (!varianteId) {
      setError('Seleccioná una variante.');
      return;
    }

    const cantidadNum = Number(cantidad);
    if (!Number.isInteger(cantidadNum) || cantidadNum <= 0) {
      setError('La cantidad debe ser un número entero mayor a cero.');
      return;
    }

    const stockDisponible = stock.find((s) => s.variante_id === varianteId)?.cantidad ?? 0;
    if (cantidadNum > stockDisponible) {
      setError(`No tenés stock suficiente. Disponible: ${stockDisponible}`);
      return;
    }

    setProcesando(true);
    try {
      const resultado = await simularVenta({
        variante_id: varianteId,
        lista_id: '', // se ignora; la venta de reventa usa siempre la lista Reventa
        cantidad: cantidadNum,
      });
      setSimulacion(resultado);
      setMontoPagado(String(resultado.total_ars));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al simular la venta.');
    } finally {
      setProcesando(false);
    }
  };

  const handleVender = async () => {
    if (!simulacion) return;

    setProcesando(true);
    setError(null);
    setExito(null);

    try {
      const monto = metodoPago ? Number(montoPagado) : 0;
      await registrarVentaReventa({
        variante_id: simulacion.variante.id,
        cantidad: simulacion.cantidad,
        metodo_pago: metodoPago || undefined,
        monto_pagado_ars: monto > 0 ? monto : undefined,
      });

      setExito('Venta registrada correctamente.');
      setSimulacion(null);
      setVarianteId('');
      setCantidad('1');
      setMetodoPago('');
      setMontoPagado('');
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar la venta.');
    } finally {
      setProcesando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader size="lg" color="violet" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-textPrimary">Registrar venta</h1>
        <p className="text-sm text-textMuted">Vendé mercadería de tu stock consignado</p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-textPrimary">Nueva venta</h3>
          {tcVigente ? (
            <span className="text-sm text-textMuted">
              TC: <span className="font-mono text-accentGreen">${tcVigente.toFixed(2)}</span>
            </span>
          ) : (
            <span className="text-sm text-red-400">Sin TC</span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Variante"
            value={varianteId}
            onChange={(e) => setVarianteId(e.target.value)}
            placeholder="Seleccionar variante"
            options={stock.map((s) => ({
              value: s.variante_id,
              label: `${s.variantes?.productos?.nombre ?? ''} — ${s.variantes?.sku ?? 'Sin SKU'} (disp: ${s.cantidad})`,
            }))}
          />
          <Input
            label="Cantidad"
            type="number"
            min="1"
            step="1"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Método de pago"
            value={metodoPago}
            onChange={(e) => setMetodoPago(e.target.value as 'efectivo' | 'transferencia' | '')}
            placeholder="Sin pago (queda deuda)"
            options={[
              { value: 'efectivo', label: 'Efectivo' },
              { value: 'transferencia', label: 'Transferencia' },
            ]}
          />
          {metodoPago && (
            <Input
              label="Monto pagado ARS"
              type="number"
              step="0.01"
              min="0"
              value={montoPagado}
              onChange={(e) => setMontoPagado(e.target.value)}
            />
          )}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button onClick={handleSimular} isLoading={procesando}>
            Calcular
          </Button>
          <Button
            variant="secondary"
            onClick={handleVender}
            disabled={!simulacion || procesando}
            isLoading={procesando}
          >
            Confirmar venta
          </Button>
        </div>

        {error && <p className="mt-3 text-sm font-medium text-red-400">{error}</p>}
        {exito && <p className="mt-3 text-sm font-medium text-accentGreen">{exito}</p>}

        {simulacion && (
          <div className="mt-5 grid grid-cols-1 gap-3 rounded-md border border-border bg-[#0B0B0C] p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-textMuted">Precio unitario</p>
              <p className="font-mono text-sm text-textPrimary">{formatArs(simulacion.precio_unit_ars)}</p>
            </div>
            <div>
              <p className="text-xs text-textMuted">Total ARS</p>
              <p className="font-mono text-base font-semibold text-textPrimary">
                {formatArs(simulacion.total_ars)}
              </p>
            </div>
            <div>
              <p className="text-xs text-textMuted">TC usado</p>
              <p className="font-mono text-sm text-accentGreen">${simulacion.tc_usado.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-textMuted">Total USD (snapshot)</p>
              <p className="font-mono text-base font-semibold text-accent">
                ${simulacion.total_usd.toFixed(2)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

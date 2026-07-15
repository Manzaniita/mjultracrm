import * as React from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { simularVenta, registrarVentaDirecta } from '../../services/ventasService';
import type {
  VarianteConPrecios,
  ListaPrecioRow,
  VentaSimulacion,
} from '../../types/precios';

interface SimuladorVentaProps {
  variantes: VarianteConPrecios[];
  listas: ListaPrecioRow[];
  tcVigente: number | null;
  onVentaRegistrada?: () => void;
}

function formatArs(valor: number): string {
  return `$${valor.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function SimuladorVenta({
  variantes,
  listas,
  tcVigente,
  onVentaRegistrada,
}: SimuladorVentaProps) {
  const [varianteId, setVarianteId] = React.useState('');
  const [listaId, setListaId] = React.useState('');
  const [cantidad, setCantidad] = React.useState('1');
  const [simulacion, setSimulacion] = React.useState<VentaSimulacion | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [guardando, setGuardando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [exito, setExito] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (listas.length > 0 && !listaId) {
      setListaId(listas[0].id);
    }
  }, [listas, listaId]);

  const handleSimular = async () => {
    setError(null);
    setExito(null);
    setSimulacion(null);

    if (!varianteId || !listaId) {
      setError('Seleccioná una variante y una lista.');
      return;
    }

    const cantidadNum = Number(cantidad);
    if (!Number.isInteger(cantidadNum) || cantidadNum <= 0) {
      setError('La cantidad debe ser un número entero mayor a cero.');
      return;
    }

    setLoading(true);
    try {
      const resultado = await simularVenta({
        variante_id: varianteId,
        lista_id: listaId,
        cantidad: cantidadNum,
      });
      setSimulacion(resultado);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al simular la venta.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuardar = async () => {
    if (!simulacion) return;

    setGuardando(true);
    setError(null);
    setExito(null);

    try {
      await registrarVentaDirecta({
        variante_id: simulacion.variante.id,
        lista_id: simulacion.lista.id,
        cantidad: simulacion.cantidad,
      });
      setExito('Venta registrada con snapshot USD congelado.');
      setSimulacion(null);
      setCantidad('1');
      onVentaRegistrada?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar la venta.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="rounded-lg border border-[#1F1F23] bg-[#121214] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-[#F4F4F5]">
          Simular venta directa
        </h3>
        {tcVigente ? (
          <span className="text-sm text-[#A1A1AA]">
            TC:{' '}
            <span className="font-mono text-[#00F5A0]">
              ${tcVigente.toFixed(2)}
            </span>
          </span>
        ) : (
          <span className="text-sm text-red-400">Sin TC</span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-[#A1A1AA]">
            Variante
          </label>
          <select
            value={varianteId}
            onChange={(e) => setVarianteId(e.target.value)}
            className="w-full rounded-md border border-[#1F1F23] bg-[#161619] px-3 py-2.5 text-sm text-[#F4F4F5] focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
          >
            <option value="">Seleccionar variante</option>
            {variantes.map((v) => (
              <option key={v.id} value={v.id}>
                {v.productos?.nombre} — {v.sku ?? 'Sin SKU'} (USD {v.costo_usd})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#A1A1AA]">
            Lista
          </label>
          <select
            value={listaId}
            onChange={(e) => setListaId(e.target.value)}
            className="w-full rounded-md border border-[#1F1F23] bg-[#161619] px-3 py-2.5 text-sm text-[#F4F4F5] focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
          >
            {listas.map((lista) => (
              <option key={lista.id} value={lista.id}>
                {lista.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Input
            label="Cantidad"
            type="number"
            min="1"
            step="1"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            inputSize="md"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button onClick={handleSimular} isLoading={loading}>
          Simular
        </Button>
        <Button
          variant="secondary"
          onClick={handleGuardar}
          disabled={!simulacion || guardando}
          isLoading={guardando}
        >
          Guardar venta
        </Button>
      </div>

      {error && <p className="mt-3 text-sm font-medium text-red-400">{error}</p>}
      {exito && <p className="mt-3 text-sm font-medium text-[#00F5A0]">{exito}</p>}

      {simulacion && (
        <div className="mt-5 grid grid-cols-1 gap-3 rounded-md border border-[#1F1F23] bg-[#0B0B0C] p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-[#52525B]">Precio unitario</p>
            <p className="font-mono text-sm text-[#F4F4F5]">
              {formatArs(simulacion.precio_unit_ars)}
              {simulacion.precio_manual && (
                <span className="ml-2 text-[10px] uppercase text-[#7C3AED]">
                  Manual
                </span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#52525B]">Total ARS</p>
            <p className="font-mono text-base font-semibold text-[#F4F4F5]">
              {formatArs(simulacion.total_ars)}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#52525B]">TC usado</p>
            <p className="font-mono text-sm text-[#00F5A0]">
              ${simulacion.tc_usado.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#52525B]">Total USD (snapshot)</p>
            <p className="font-mono text-base font-semibold text-[#7C3AED]">
              ${simulacion.total_usd.toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

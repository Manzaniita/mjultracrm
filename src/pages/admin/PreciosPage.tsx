import * as React from 'react';
import {
  TipoCambioForm,
  PreciosTable,
  EdicionMasivaModal,
  SimuladorVenta,
} from '@/components/precios';
import { Loader } from '@/components/ui/Loader';
import {
  obtenerVariantesConPrecios,
  obtenerListasPrecios,
  obtenerTipoCambioVigente,
  aplicarOverrideManual,
  liberarPrecioManual,
  recalcularPreciosAutomaticos,
  edicionMasivaPorCosto,
} from '@/services/preciosService';
import type { VarianteConPrecios, ListaPrecioRow } from '@/types/precios';

export function PreciosPage() {
  const [variantes, setVariantes] = React.useState<VarianteConPrecios[]>([]);
  const [listas, setListas] = React.useState<ListaPrecioRow[]>([]);
  const [tcVigente, setTcVigente] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [procesando, setProcesando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [modalMasivaOpen, setModalMasivaOpen] = React.useState(false);

  const cargar = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [v, l, tc] = await Promise.all([
        obtenerVariantesConPrecios(),
        obtenerListasPrecios(),
        obtenerTipoCambioVigente().catch(() => null),
      ]);
      setVariantes(v);
      setListas(l);
      setTcVigente(tc);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar precios.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    cargar();
  }, [cargar]);

  const handleRecalcular = async () => {
    setProcesando(true);
    try {
      await recalcularPreciosAutomaticos();
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al recalcular precios.');
    } finally {
      setProcesando(false);
    }
  };

  const handleOverride = async (varianteId: string, listaId: string, precioArs: number) => {
    setError(null);
    try {
      await aplicarOverrideManual({ variante_id: varianteId, lista_id: listaId, precio_ars: precioArs });
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al aplicar el precio manual.');
    }
  };

  const handleLiberar = async (varianteId: string, listaId: string) => {
    setError(null);
    try {
      await liberarPrecioManual(varianteId, listaId);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al liberar el precio manual.');
    }
  };

  const handleEdicionMasiva = async (listaId: string, costoUsd: number, precioArs: number) => {
    setError(null);
    try {
      await edicionMasivaPorCosto({ lista_id: listaId, costo_usd: costoUsd, precio_ars: precioArs });
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en la edición masiva.');
    }
  };

  const handleTcCargado = (tc: { valor: number }) => {
    setTcVigente(tc.valor);
    cargar();
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
        <h1 className="text-2xl font-bold text-textPrimary">Precios</h1>
        <p className="text-sm text-textMuted">Tipo de cambio, listas y overrides</p>
      </div>

      {error && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400">
          {error}
        </p>
      )}

      <TipoCambioForm onCargado={handleTcCargado} />

      <PreciosTable
        variantes={variantes}
        listas={listas}
        tcVigente={tcVigente}
        isLoading={procesando}
        onRecalcular={handleRecalcular}
        onOverride={handleOverride}
        onLiberar={handleLiberar}
        onEdicionMasiva={() => setModalMasivaOpen(true)}
      />

      <SimuladorVenta
        variantes={variantes}
        listas={listas}
        tcVigente={tcVigente}
        onVentaRegistrada={cargar}
      />

      <EdicionMasivaModal
        isOpen={modalMasivaOpen}
        onClose={() => setModalMasivaOpen(false)}
        listas={listas}
        onAplicar={handleEdicionMasiva}
      />
    </div>
  );
}

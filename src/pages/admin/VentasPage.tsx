import * as React from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Loader } from '@/components/ui/Loader';
import { listarVentas, anularVenta } from '@/services/ventasService';
import { SimuladorVenta } from '@/components/precios';
import { obtenerVariantesConPrecios, obtenerListasPrecios, obtenerTipoCambioVigente } from '@/services/preciosService';
import type { Column } from '@/components/ui/Table';
import type { VentaConDetalle } from '@/services/ventasService';
import type { VarianteConPrecios, ListaPrecioRow } from '@/types/precios';

const estadoVariant: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  pagada: 'success',
  parcial: 'warning',
  pendiente: 'default',
  anulada: 'danger',
};

function formatArs(valor: number): string {
  return `$${valor.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatUsd(valor: number): string {
  return `$${valor.toFixed(2)}`;
}

export function VentasPage() {
  const [ventas, setVentas] = React.useState<VentaConDetalle[]>([]);
  const [variantes, setVariantes] = React.useState<VarianteConPrecios[]>([]);
  const [listas, setListas] = React.useState<ListaPrecioRow[]>([]);
  const [tcVigente, setTcVigente] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [anulando, setAnulando] = React.useState<string | null>(null);
  const [motivo, setMotivo] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const cargar = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [v, varList, l, tc] = await Promise.all([
        listarVentas(),
        obtenerVariantesConPrecios(),
        obtenerListasPrecios(),
        obtenerTipoCambioVigente().catch(() => null),
      ]);
      setVentas(v);
      setVariantes(varList);
      setListas(l);
      setTcVigente(tc);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar ventas.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    cargar();
  }, [cargar]);

  const confirmarAnulacion = async () => {
    if (!anulando) return;
    try {
      await anularVenta(anulando, motivo);
      setAnulando(null);
      setMotivo('');
      await cargar();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al anular la venta.');
    }
  };

  const columns: Column<VentaConDetalle>[] = [
    {
      key: 'fecha',
      header: 'Fecha',
      render: (v) => new Date(v.fecha).toLocaleDateString('es-AR'),
    },
    {
      key: 'reventa',
      header: 'Reventa',
      render: (v) => v.reventa?.nombre ?? 'Venta directa',
    },
    {
      key: 'total',
      header: 'Total ARS',
      align: 'right',
      mono: true,
      render: (v) => formatArs(v.total_ars),
    },
    {
      key: 'usd',
      header: 'Total USD',
      align: 'right',
      mono: true,
      render: (v) => formatUsd(v.total_usd),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (v) => (
        <Badge variant={v.anulada ? 'danger' : estadoVariant[v.estado_cobro] ?? 'default'}>
          {v.anulada ? 'anulada' : v.estado_cobro}
        </Badge>
      ),
    },
    {
      key: 'acciones',
      header: '',
      align: 'right',
      render: (v) =>
        !v.anulada ? (
          <Button size="sm" variant="danger" onClick={() => setAnulando(v.id)}>
            Anular
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400">
          {error}
        </p>
      )}
      <div>
        <h1 className="text-2xl font-bold text-textPrimary">Ventas</h1>
        <p className="text-sm text-textMuted">Listado global y registro de ventas directas</p>
      </div>

      <SimuladorVenta
        variantes={variantes}
        listas={listas}
        tcVigente={tcVigente}
        onVentaRegistrada={cargar}
      />

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <Loader size="lg" color="violet" />
        </div>
      ) : (
        <Table<VentaConDetalle> columns={columns} data={ventas} keyExtractor={(v) => v.id} />
      )}

      <Modal
        isOpen={Boolean(anulando)}
        onClose={() => setAnulando(null)}
        title="Anular venta"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Motivo de anulación"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: error de carga"
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setAnulando(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmarAnulacion}>
              Confirmar anulación
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

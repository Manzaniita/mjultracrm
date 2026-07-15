import * as React from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Loader } from '@/components/ui/Loader';
import {
  listarPedidosReposicion,
  aprobarPedidoReposicion,
  rechazarPedidoReposicion,
} from '@/services/pedidosService';
import type { Column } from '@/components/ui/Table';
import type { PedidoConDetalle } from '@/services/pedidosService';

const estadoVariant: Record<string, 'warning' | 'success' | 'danger' | 'default'> = {
  pendiente: 'warning',
  aprobado: 'success',
  aprobado_parcial: 'success',
  rechazado: 'danger',
};

export function PedidosPage() {
  const [pedidos, setPedidos] = React.useState<PedidoConDetalle[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [procesando, setProcesando] = React.useState(false);
  const [pedidoSeleccionado, setPedidoSeleccionado] = React.useState<PedidoConDetalle | null>(null);
  const [cantidadesAprobadas, setCantidadesAprobadas] = React.useState<Record<string, string>>({});
  const [motivoRechazo, setMotivoRechazo] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const cargar = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listarPedidosReposicion();
      setPedidos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar pedidos.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirAprobar = (pedido: PedidoConDetalle) => {
    const iniciales: Record<string, string> = {};
    for (const linea of pedido.pedido_reposicion_lineas) {
      iniciales[linea.id] = String(linea.cantidad_solicitada);
    }
    setCantidadesAprobadas(iniciales);
    setPedidoSeleccionado(pedido);
    setMotivoRechazo('');
  };

  const handleAprobar = async () => {
    if (!pedidoSeleccionado) return;
    setProcesando(true);
    setError(null);
    try {
      const lineas = Object.entries(cantidadesAprobadas).map(([linea_id, cantidad]) => ({
        linea_id,
        cantidad_aprobada: Number(cantidad),
      }));
      await aprobarPedidoReposicion(pedidoSeleccionado.id, { lineas });
      setPedidoSeleccionado(null);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al aprobar el pedido.');
    } finally {
      setProcesando(false);
    }
  };

  const handleRechazar = async () => {
    if (!pedidoSeleccionado) return;
    setProcesando(true);
    setError(null);
    try {
      await rechazarPedidoReposicion(pedidoSeleccionado.id, motivoRechazo);
      setPedidoSeleccionado(null);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al rechazar el pedido.');
    } finally {
      setProcesando(false);
    }
  };

  const columns: Column<PedidoConDetalle>[] = [
    {
      key: 'fecha',
      header: 'Fecha',
      render: (p) => new Date(p.created_at).toLocaleDateString('es-AR'),
    },
    {
      key: 'reventa',
      header: 'Reventa',
      render: (p) => p.perfiles?.nombre ?? '—',
    },
    {
      key: 'lineas',
      header: 'Líneas',
      render: (p) => p.pedido_reposicion_lineas.length,
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (p) => <Badge variant={estadoVariant[p.estado] ?? 'default'}>{p.estado}</Badge>,
    },
    {
      key: 'acciones',
      header: '',
      align: 'right',
      render: (p) =>
        p.estado === 'pendiente' ? (
          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={() => abrirAprobar(p)}>
              Aprobar
            </Button>
            <Button size="sm" variant="danger" onClick={() => setPedidoSeleccionado(p)}>
              Rechazar
            </Button>
          </div>
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
        <h1 className="text-2xl font-bold text-textPrimary">Pedidos de reposición</h1>
        <p className="text-sm text-textMuted">Bandeja de pedidos de las reventas</p>
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <Loader size="lg" color="violet" />
        </div>
      ) : (
        <Table<PedidoConDetalle> columns={columns} data={pedidos} keyExtractor={(p) => p.id} />
      )}

      {/* Modal aprobar */}
      <Modal
        isOpen={pedidoSeleccionado?.estado === 'pendiente' && cantidadesAprobadas[pedidoSeleccionado.pedido_reposicion_lineas[0]?.id] !== undefined}
        onClose={() => setPedidoSeleccionado(null)}
        title="Aprobar pedido"
      >
        {pedidoSeleccionado && (
          <div className="flex flex-col gap-4">
            {pedidoSeleccionado.pedido_reposicion_lineas.map((linea) => (
              <div key={linea.id}>
                <label className="mb-1.5 block text-sm font-medium text-textMuted">
                  {linea.variantes?.productos?.nombre} — {linea.variantes?.sku ?? 'Sin SKU'}
                  <span className="ml-2 text-xs text-textMuted">
                    (solicitado: {linea.cantidad_solicitada})
                  </span>
                </label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={cantidadesAprobadas[linea.id] ?? String(linea.cantidad_solicitada)}
                  onChange={(e) =>
                    setCantidadesAprobadas({
                      ...cantidadesAprobadas,
                      [linea.id]: e.target.value,
                    })
                  }
                />
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setPedidoSeleccionado(null)}>
                Cancelar
              </Button>
              <Button onClick={handleAprobar} isLoading={procesando}>
                Confirmar aprobación
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal rechazar */}
      <Modal
        isOpen={pedidoSeleccionado?.estado === 'pendiente' && cantidadesAprobadas[pedidoSeleccionado.pedido_reposicion_lineas[0]?.id] === undefined}
        onClose={() => setPedidoSeleccionado(null)}
        title="Rechazar pedido"
      >
        {pedidoSeleccionado && (
          <div className="flex flex-col gap-4">
            <Input
              label="Motivo de rechazo"
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              placeholder="Ej: sin stock disponible"
              required
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setPedidoSeleccionado(null)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleRechazar} isLoading={procesando}>
                Confirmar rechazo
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

import * as React from 'react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Loader } from '@/components/ui/Loader';
import { listarMisPedidosReposicion, crearPedidoReposicion } from '@/services/pedidosService';
import { obtenerVariantesConPrecios } from '@/services/preciosService';
import type { Column } from '@/components/ui/Table';
import type { PedidoConDetalle } from '@/services/pedidosService';
import type { VarianteConPrecios } from '@/types/precios';

const estadoVariant: Record<string, 'warning' | 'success' | 'danger' | 'default'> = {
  pendiente: 'warning',
  aprobado: 'success',
  aprobado_parcial: 'success',
  rechazado: 'danger',
};

export function PedidosPage() {
  const [pedidos, setPedidos] = React.useState<PedidoConDetalle[]>([]);
  const [variantes, setVariantes] = React.useState<VarianteConPrecios[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [lineas, setLineas] = React.useState<{ variante_id: string; cantidad: string }[]>([
    { variante_id: '', cantidad: '1' },
  ]);
  const [error, setError] = React.useState<string | null>(null);

  const cargar = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, v] = await Promise.all([listarMisPedidosReposicion(), obtenerVariantesConPrecios()]);
      setPedidos(p);
      setVariantes(v);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar pedidos.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    cargar();
  }, [cargar]);

  const addLinea = () => setLineas([...lineas, { variante_id: '', cantidad: '1' }]);
  const removeLinea = (index: number) => setLineas(lineas.filter((_, i) => i !== index));
  const updateLinea = (index: number, field: 'variante_id' | 'cantidad', value: string) => {
    const next = [...lineas];
    next[index] = { ...next[index], [field]: value };
    setLineas(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const lineasLimpias = lineas
        .filter((l) => l.variante_id)
        .map((l) => ({
          variante_id: l.variante_id,
          cantidad_solicitada: Number(l.cantidad),
        }));

      await crearPedidoReposicion({ lineas: lineasLimpias });
      setModalOpen(false);
      setLineas([{ variante_id: '', cantidad: '1' }]);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el pedido.');
    }
  };

  const columns: Column<PedidoConDetalle>[] = [
    {
      key: 'fecha',
      header: 'Fecha',
      render: (p) => new Date(p.created_at).toLocaleDateString('es-AR'),
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
      key: 'motivo',
      header: 'Motivo',
      render: (p) => p.motivo_rechazo ?? '—',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400">
          {error}
        </p>
      )}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Mis pedidos</h1>
          <p className="text-sm text-textMuted">Pedidos de reposición enviados</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ Nuevo pedido</Button>
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <Loader size="lg" color="violet" />
        </div>
      ) : (
        <Table<PedidoConDetalle> columns={columns} data={pedidos} keyExtractor={(p) => p.id} />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nuevo pedido de reposición"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            {lineas.map((linea, i) => (
              <div key={i} className="flex gap-2">
                <div className="flex-[2]">
                  <Select
                    value={linea.variante_id}
                    onChange={(e) => updateLinea(i, 'variante_id', e.target.value)}
                    placeholder="Variante"
                    options={variantes.map((v) => ({
                      value: v.id,
                      label: `${v.productos?.nombre ?? ''} — ${v.sku ?? 'Sin SKU'}`,
                    }))}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={linea.cantidad}
                    onChange={(e) => updateLinea(i, 'cantidad', e.target.value)}
                  />
                </div>
                <Button type="button" variant="ghost" onClick={() => removeLinea(i)}>
                  ✕
                </Button>
              </div>
            ))}
            <Button type="button" variant="secondary" size="sm" onClick={addLinea}>
              + Agregar línea
            </Button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={lineas.every((l) => !l.variante_id)}>
              Enviar pedido
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

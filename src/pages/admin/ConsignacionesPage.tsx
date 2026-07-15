import * as React from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Loader } from '@/components/ui/Loader';
import { listarPerfiles } from '@/services/usuariosService';
import { obtenerVariantesConPrecios } from '@/services/preciosService';
import {
  listarConsignaciones,
  crearConsignacion,
} from '@/services/consignacionesService';
import type { Column } from '@/components/ui/Table';
import type { PerfilRow } from '@/types';
import type { VarianteConPrecios } from '@/types/precios';
import type { ConsignacionConDetalle } from '@/services/consignacionesService';

export function ConsignacionesPage() {
  const [consignaciones, setConsignaciones] = React.useState<ConsignacionConDetalle[]>([]);
  const [reventas, setReventas] = React.useState<PerfilRow[]>([]);
  const [variantes, setVariantes] = React.useState<VarianteConPrecios[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [reventaId, setReventaId] = React.useState('');
  const [lineas, setLineas] = React.useState<{ variante_id: string; cantidad: string }[]>([
    { variante_id: '', cantidad: '1' },
  ]);

  const cargar = React.useCallback(async () => {
    setLoading(true);
    const [c, r, v] = await Promise.all([
      listarConsignaciones(),
      listarPerfiles().then((p) => p.filter((x) => x.rol === 'reventa')),
      obtenerVariantesConPrecios(),
    ]);
    setConsignaciones(c);
    setReventas(r);
    setVariantes(v);
    setLoading(false);
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
    const lineasLimpias = lineas
      .filter((l) => l.variante_id)
      .map((l) => ({
        variante_id: l.variante_id,
        cantidad: Number(l.cantidad),
      }));

    await crearConsignacion({ reventa_id: reventaId, lineas: lineasLimpias });
    setModalOpen(false);
    setReventaId('');
    setLineas([{ variante_id: '', cantidad: '1' }]);
    await cargar();
  };

  const columns: Column<ConsignacionConDetalle>[] = [
    {
      key: 'fecha',
      header: 'Fecha',
      render: (c) => new Date(c.fecha).toLocaleDateString('es-AR'),
    },
    {
      key: 'reventa',
      header: 'Reventa',
      render: (c) => c.perfiles?.nombre ?? '—',
    },
    {
      key: 'lineas',
      header: 'Líneas',
      render: (c) => c.consignacion_lineas.length,
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (c) => <Badge variant={c.estado === 'activa' ? 'success' : 'default'}>{c.estado}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Consignaciones</h1>
          <p className="text-sm text-textMuted">Entregas de mercadería a reventas</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ Nueva consignación</Button>
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <Loader size="lg" color="violet" />
        </div>
      ) : (
        <Table<ConsignacionConDetalle>
          columns={columns}
          data={consignaciones}
          keyExtractor={(c) => c.id}
        />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nueva consignación"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Select
            label="Reventa"
            value={reventaId}
            onChange={(e) => setReventaId(e.target.value)}
            placeholder="Seleccionar reventa"
            options={reventas.map((r) => ({ value: r.id, label: r.nombre }))}
            required
          />

          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-textMuted">Líneas</label>
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
            <Button type="submit" disabled={!reventaId || lineas.every((l) => !l.variante_id)}>
              Crear consignación
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

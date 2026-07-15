import * as React from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Loader } from '@/components/ui/Loader';
import {
  listarMovimientos,
  crearMovimientoManual,
  calcularSaldosPorMetodo,
} from '@/services/cajaService';
import type { Column } from '@/components/ui/Table';
import type { CajaMovimientoRow } from '@/types';
import type { TipoCajaMovimiento, MetodoPago } from '@/types';

function formatArs(valor: number): string {
  return `$${valor.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const tipoOptions = [
  { value: 'egreso', label: 'Egreso' },
  { value: 'gasto', label: 'Gasto' },
];

const metodoOptions = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
];

const tipoVariant: Record<TipoCajaMovimiento, 'success' | 'danger' | 'warning'> = {
  ingreso: 'success',
  egreso: 'danger',
  gasto: 'warning',
};

export function CajaPage() {
  const [movimientos, setMovimientos] = React.useState<CajaMovimientoRow[]>([]);
  const [saldos, setSaldos] = React.useState({ efectivo: 0, transferencia: 0 });
  const [loading, setLoading] = React.useState(true);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [tipo, setTipo] = React.useState<TipoCajaMovimiento>('egreso');
  const [metodo, setMetodo] = React.useState<MetodoPago>('efectivo');
  const [monto, setMonto] = React.useState('');
  const [motivo, setMotivo] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const cargar = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, s] = await Promise.all([listarMovimientos(), calcularSaldosPorMetodo()]);
      setMovimientos(m);
      setSaldos(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar caja.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    cargar();
  }, [cargar]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await crearMovimientoManual({
        tipo,
        metodo,
        monto_ars: Number(monto),
        motivo,
      });
      setModalOpen(false);
      setMonto('');
      setMotivo('');
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el movimiento.');
    }
  };

  const columns: Column<CajaMovimientoRow>[] = [
    {
      key: 'fecha',
      header: 'Fecha',
      render: (m) => new Date(m.created_at).toLocaleDateString('es-AR'),
    },
    {
      key: 'tipo',
      header: 'Tipo',
      render: (m) => <Badge variant={tipoVariant[m.tipo]}>{m.tipo}</Badge>,
    },
    {
      key: 'metodo',
      header: 'Método',
      render: (m) => m.metodo,
    },
    {
      key: 'monto',
      header: 'Monto ARS',
      align: 'right',
      mono: true,
      render: (m) => (
        <span className={m.tipo === 'ingreso' ? 'text-accentGreen' : 'text-textPrimary'}>
          {formatArs(m.monto_ars)}
        </span>
      ),
    },
    {
      key: 'motivo',
      header: 'Motivo',
      render: (m) => m.motivo,
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
          <h1 className="text-2xl font-bold text-textPrimary">Caja</h1>
          <p className="text-sm text-textMuted">Movimientos y saldos por método</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ Cargar movimiento</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-textPrimary">{formatArs(saldos.efectivo)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-textMuted">Efectivo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-textPrimary">
              {formatArs(saldos.transferencia)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-textMuted">Transferencia</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-accentGreen">
              {formatArs(saldos.efectivo + saldos.transferencia)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-textMuted">Total</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <Loader size="lg" color="violet" />
        </div>
      ) : (
        <Table<CajaMovimientoRow>
          columns={columns}
          data={movimientos}
          keyExtractor={(m) => m.id}
        />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nuevo movimiento de caja"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Select
            label="Tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoCajaMovimiento)}
            options={tipoOptions}
          />
          <Select
            label="Método"
            value={metodo}
            onChange={(e) => setMetodo(e.target.value as MetodoPago)}
            options={metodoOptions}
          />
          <Input
            label="Monto ARS"
            type="number"
            step="0.01"
            min="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            required
          />
          <Input
            label="Motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: compra de mercadería"
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

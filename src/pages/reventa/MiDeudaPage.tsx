import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Loader } from '@/components/ui/Loader';
import { obtenerMiDeuda } from '@/services/ventasService';
import { crearPago } from '@/services/pagosService';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import type { Column } from '@/components/ui/Table';
import type { DetalleDeudaReventa } from '@/services/ventasService';
import type { VentaRow, PagoRow } from '@/types';

function formatArs(valor: number): string {
  return `$${valor.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const estadoVariant: Record<string, 'success' | 'warning' | 'default' | 'danger'> = {
  pagada: 'success',
  parcial: 'warning',
  pendiente: 'default',
  anulada: 'danger',
};

export function MiDeudaPage() {
  const [deuda, setDeuda] = React.useState<DetalleDeudaReventa | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [ventaPago, setVentaPago] = React.useState<VentaRow & { deuda: number } | null>(null);
  const [monto, setMonto] = React.useState('');
  const [metodo, setMetodo] = React.useState<'efectivo' | 'transferencia'>('efectivo');
  const [error, setError] = React.useState<string | null>(null);

  const cargar = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await obtenerMiDeuda();
      setDeuda(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar la deuda.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    cargar();
  }, [cargar]);

  const handlePago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ventaPago) return;
    setError(null);
    try {
      await crearPago({
        venta_id: ventaPago.id,
        monto_ars: Number(monto),
        metodo,
      });
      setVentaPago(null);
      setMonto('');
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar el pago.');
    }
  };

  const columns: Column<VentaRow & { deuda: number; pagos: PagoRow[] }>[] = [
    {
      key: 'fecha',
      header: 'Fecha',
      render: (v) => new Date(v.fecha).toLocaleDateString('es-AR'),
    },
    {
      key: 'total',
      header: 'Total ARS',
      align: 'right',
      mono: true,
      render: (v) => formatArs(v.total_ars),
    },
    {
      key: 'pagado',
      header: 'Pagado',
      align: 'right',
      mono: true,
      render: (v) => formatArs(v.total_ars - v.deuda),
    },
    {
      key: 'deuda',
      header: 'Deuda',
      align: 'right',
      mono: true,
      render: (v) => <span className="font-semibold text-red-400">{formatArs(v.deuda)}</span>,
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
        !v.anulada && v.estado_cobro !== 'pagada' ? (
          <Button
            size="sm"
            onClick={() => {
              setVentaPago(v);
              setMonto(String(v.deuda));
            }}
          >
            Pagar
          </Button>
        ) : null,
    },
  ];

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader size="lg" color="violet" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400">
          {error}
        </p>
      )}
      <div>
        <h1 className="text-2xl font-bold text-textPrimary">Mi deuda</h1>
        <p className="text-sm text-textMuted">Resumen de ventas y pagos pendientes</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-red-400">{formatArs(deuda?.deuda_ars ?? 0)}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-textMuted">Deuda total actual</p>
        </CardContent>
      </Card>

      <Table<VentaRow & { deuda: number; pagos: PagoRow[] }>
        columns={columns}
        data={deuda?.ventas ?? []}
        keyExtractor={(v) => v.id}
        emptyMessage="No tenés ventas registradas."
      />

      {/* Modal pago */}
      {ventaPago && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-2xl">
            <h3 className="mb-4 text-lg font-semibold text-textPrimary">Registrar pago</h3>
            <form onSubmit={handlePago} className="flex flex-col gap-4">
              <Select
                label="Método"
                value={metodo}
                onChange={(e) => setMetodo(e.target.value as 'efectivo' | 'transferencia')}
                options={[
                  { value: 'efectivo', label: 'Efectivo' },
                  { value: 'transferencia', label: 'Transferencia' },
                ]}
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
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setVentaPago(null)}>
                  Cancelar
                </Button>
                <Button type="submit">Registrar pago</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

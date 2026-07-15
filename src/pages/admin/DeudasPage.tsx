import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Loader } from '@/components/ui/Loader';
import { detalleDeudaPorVenta } from '@/services/deudasService';
import type { Column } from '@/components/ui/Table';
import type { DeudaPorReventa, DeudaPorVenta } from '@/services/deudasService';

function formatArs(valor: number): string {
  return `$${valor.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function DeudasPage() {
  const [deudores, setDeudores] = React.useState<DeudaPorReventa[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const cargar = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await detalleDeudaPorVenta();
      setDeudores(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar deudas.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    cargar();
  }, [cargar]);

  const totalDeuda = deudores.reduce((acc, d) => acc + d.deuda_total, 0);
  const totalVentas = deudores.reduce((acc, d) => acc + d.ventas.length, 0);

  const columns: Column<DeudaPorReventa>[] = [
    {
      key: 'reventa',
      header: 'Reventa',
      render: (d) => d.reventa.nombre,
    },
    {
      key: 'ventas',
      header: 'Ventas',
      align: 'right',
      render: (d) => d.ventas.length,
    },
    {
      key: 'total',
      header: 'Total ARS',
      align: 'right',
      mono: true,
      render: (d) =>
        formatArs(d.ventas.reduce((acc: number, v: DeudaPorVenta) => acc + v.total_ars, 0)),
    },
    {
      key: 'pagado',
      header: 'Pagado ARS',
      align: 'right',
      mono: true,
      render: (d) =>
        formatArs(d.ventas.reduce((acc: number, v: DeudaPorVenta) => acc + v.total_pagado, 0)),
    },
    {
      key: 'deuda',
      header: 'Deuda ARS',
      align: 'right',
      mono: true,
      render: (d) => <span className="font-semibold text-red-400">{formatArs(d.deuda_total)}</span>,
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
        <h1 className="text-2xl font-bold text-textPrimary">Deudas</h1>
        <p className="text-sm text-textMuted">Ranking de deudores y saldos en la calle</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-red-400">{formatArs(totalDeuda)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-textMuted">Deuda total ARS</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-textPrimary">{totalVentas}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-textMuted">Ventas con deuda</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <Loader size="lg" color="violet" />
        </div>
      ) : (
        <Table<DeudaPorReventa>
          columns={columns}
          data={deudores}
          keyExtractor={(d) => d.reventa.id}
          emptyMessage="No hay deudas registradas."
        />
      )}
    </div>
  );
}

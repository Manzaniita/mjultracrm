import * as React from 'react';
import { Table } from '@/components/ui/Table';
import { Loader } from '@/components/ui/Loader';
import { obtenerMiStock } from '@/services/consignacionesService';
import type { Column } from '@/components/ui/Table';
import type { StockConsignadoConDetalle } from '@/services/consignacionesService';

export function MiStockPage() {
  const [stock, setStock] = React.useState<StockConsignadoConDetalle[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const cargar = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await obtenerMiStock();
      setStock(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el stock.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    cargar();
  }, [cargar]);

  const columns: Column<StockConsignadoConDetalle>[] = [
    {
      key: 'producto',
      header: 'Producto',
      render: (s) => s.variantes?.productos?.nombre ?? '—',
    },
    {
      key: 'variante',
      header: 'Variante',
      render: (s) => s.variantes?.sku ?? 'Sin SKU',
      mono: true,
    },
    {
      key: 'cantidad',
      header: 'Cantidad',
      align: 'right',
      render: (s) => s.cantidad,
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
        <h1 className="text-2xl font-bold text-textPrimary">Mi stock</h1>
        <p className="text-sm text-textMuted">Mercadería consignada disponible</p>
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <Loader size="lg" color="violet" />
        </div>
      ) : (
        <Table<StockConsignadoConDetalle>
          columns={columns}
          data={stock}
          keyExtractor={(s) => `${s.variante_id}-${s.reventa_id}`}
          emptyMessage="No tenés stock consignado."
        />
      )}
    </div>
  );
}

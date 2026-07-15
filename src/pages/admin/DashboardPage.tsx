import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Loader } from '@/components/ui/Loader';
import { Badge } from '@/components/ui/Badge';
import {
  obtenerTipoCambioVigente,
  obtenerVariantesConPrecios,
} from '@/services/preciosService';
import { obtenerRankingDeudores } from '@/services/deudasService';
import { listarPedidosReposicion } from '@/services/pedidosService';
import type { VarianteConPrecios } from '@/types/precios';
import type { RankingDeudor } from '@/services/deudasService';
import type { PedidoConDetalle } from '@/services/pedidosService';

function formatArs(valor: number): string {
  return `$${valor.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function DashboardPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [tc, setTc] = React.useState<number | null>(null);
  const [deudaTotal, setDeudaTotal] = React.useState(0);
  const [stockValorizado, setStockValorizado] = React.useState(0);
  const [deudores, setDeudores] = React.useState<RankingDeudor[]>([]);
  const [pedidosPendientes, setPedidosPendientes] = React.useState<PedidoConDetalle[]>([]);

  const cargar = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tcVigente, variantes, ranking, pedidos] = await Promise.all([
        obtenerTipoCambioVigente().catch(() => null),
        obtenerVariantesConPrecios(false),
        obtenerRankingDeudores(),
        listarPedidosReposicion(),
      ]);

      setTc(tcVigente);

      const deuda = ranking.reduce(
        (acc: number, d: RankingDeudor) => acc + d.deuda_ars,
        0
      );
      setDeudaTotal(deuda);
      setDeudores(ranking.slice(0, 5));

      const stockUsd = variantes.reduce(
        (acc: number, v: VarianteConPrecios) => acc + v.costo_usd * v.stock_central,
        0
      );
      setStockValorizado(tcVigente ? stockUsd * tcVigente : 0);

      setPedidosPendientes(pedidos.filter((p: PedidoConDetalle) => p.estado === 'pendiente').slice(0, 5));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    cargar();
  }, [cargar]);

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
        <h1 className="text-2xl font-bold text-textPrimary">Dashboard</h1>
        <p className="text-sm text-textMuted">Resumen general del negocio</p>
      </div>

      {error && (
        <p className="rounded-md bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>TC vigente</CardDescription>
            <CardTitle className="text-2xl text-accentGreen">
              {tc ? formatArs(tc) : '—'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-textMuted">Último tipo de cambio cargado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Deuda total en la calle</CardDescription>
            <CardTitle className="text-2xl text-red-400">{formatArs(deudaTotal)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-textMuted">Suma de deudas de todas las reventas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Stock valorizado</CardDescription>
            <CardTitle className="text-2xl text-textPrimary">
              {formatArs(stockValorizado)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-textMuted">Stock central × costo USD × TC</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Pedidos pendientes</CardDescription>
            <CardTitle className="text-2xl text-accent">{pedidosPendientes.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-textMuted">Pedidos de reposición sin revisar</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top deudores</CardTitle>
          </CardHeader>
          <CardContent>
            {deudores.length === 0 ? (
              <p className="text-sm text-textMuted">No hay deudores registrados.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {deudores.map((d) => (
                  <li
                    key={d.reventa.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-[#0B0B0C] px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-textPrimary">{d.reventa.nombre}</p>
                      <p className="text-xs text-textMuted">{d.cantidad_ventas} ventas</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-semibold text-red-400">
                        {formatArs(d.deuda_ars)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pedidos pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            {pedidosPendientes.length === 0 ? (
              <p className="text-sm text-textMuted">No hay pedidos pendientes.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {pedidosPendientes.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-[#0B0B0C] px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-textPrimary">
                        {p.perfiles?.nombre ?? 'Reventa'}
                      </p>
                      <p className="text-xs text-textMuted">
                        {p.pedido_reposicion_lineas.length} líneas
                      </p>
                    </div>
                    <Badge variant="warning">Pendiente</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

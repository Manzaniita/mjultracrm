import * as React from 'react';
import { Table } from '../ui/Table';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Loader } from '../ui/Loader';
import type { Column } from '../ui/Table';
import type { VarianteConPrecios, ListaPrecioRow } from '../../types/precios';

interface PreciosTableProps {
  variantes: VarianteConPrecios[];
  listas: ListaPrecioRow[];
  tcVigente: number | null;
  isLoading?: boolean;
  onRecalcular: () => void;
  onOverride: (varianteId: string, listaId: string, precioArs: number) => Promise<void>;
  onLiberar: (varianteId: string, listaId: string) => Promise<void>;
  onEdicionMasiva: () => void;
}

function formatUsd(valor: number): string {
  return `$${valor.toFixed(2)}`;
}

function formatArs(valor: number): string {
  return `$${valor.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function PreciosTable({
  variantes,
  listas,
  tcVigente,
  isLoading = false,
  onRecalcular,
  onOverride,
  onLiberar,
  onEdicionMasiva,
}: PreciosTableProps) {
  const [editando, setEditando] = React.useState<{
    varianteId: string;
    listaId: string;
    valor: string;
  } | null>(null);

  const [procesando, setProcesando] = React.useState(false);

  const iniciarEdicion = (
    variante: VarianteConPrecios,
    lista: ListaPrecioRow,
    precioActual: number
  ) => {
    setEditando({
      varianteId: variante.id,
      listaId: lista.id,
      valor: precioActual.toFixed(2),
    });
  };

  const guardarEdicion = async () => {
    if (!editando) return;
    const precio = Number(editando.valor.replace(',', '.'));
    if (Number.isNaN(precio) || precio < 0) return;

    setProcesando(true);
    try {
      await onOverride(editando.varianteId, editando.listaId, precio);
      setEditando(null);
    } finally {
      setProcesando(false);
    }
  };

  const cancelarEdicion = () => setEditando(null);

  const obtenerPrecio = (
    variante: VarianteConPrecios,
    lista: ListaPrecioRow
  ): { precio: number; esManual: boolean } => {
    const guardado = variante.precios.find((p) => p.lista_id === lista.id);
    if (guardado && guardado.es_manual) {
      return { precio: guardado.precio_ars, esManual: true };
    }

    if (!tcVigente) return { precio: 0, esManual: false };
    const calculado = variante.costo_usd * tcVigente * (1 + lista.margen);
    return { precio: Number(calculado.toFixed(2)), esManual: false };
  };

  const columnasBase: Column<VarianteConPrecios>[] = [
    {
      key: 'producto',
      header: 'Producto',
      render: (v) => v.productos?.nombre ?? '—',
    },
    {
      key: 'variante',
      header: 'Variante',
      render: (v) => v.sku ?? 'Sin SKU',
      mono: true,
    },
    {
      key: 'costo',
      header: 'Costo USD',
      align: 'right',
      mono: true,
      render: (v) => formatUsd(v.costo_usd),
    },
  ];

  const columnasListas: Column<VarianteConPrecios>[] = listas.map((lista) => ({
    key: `precio-${lista.id}`,
    header: `${lista.nombre} (+${(lista.margen * 100).toFixed(0)}%)`,
    align: 'right',
    mono: true,
    render: (variante) => {
      const { precio, esManual } = obtenerPrecio(variante, lista);
      const estaEditando =
        editando?.varianteId === variante.id && editando?.listaId === lista.id;

      if (estaEditando) {
        return (
          <div className="flex items-center justify-end gap-2">
            <Input
              type="number"
              step="0.01"
              min="0"
              inputSize="sm"
              className="w-28 text-right"
              value={editando.valor}
              onChange={(e) =>
                setEditando((prev) =>
                  prev ? { ...prev, valor: e.target.value } : prev
                )
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') guardarEdicion();
                if (e.key === 'Escape') cancelarEdicion();
              }}
              autoFocus
            />
            <Button
              size="sm"
              variant="primary"
              onClick={guardarEdicion}
              isLoading={procesando}
            >
              OK
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelarEdicion}>
              ✕
            </Button>
          </div>
        );
      }

      return (
        <div className="flex items-center justify-end gap-3">
          <span className={esManual ? 'text-white' : 'text-[#A1A1AA]'}>
            {formatArs(precio)}
          </span>

          <div className="flex items-center gap-1">
            {esManual && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onLiberar(variante.id, lista.id)}
                title="Volver a precio automático"
              >
                ↺
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => iniciarEdicion(variante, lista, precio)}
            >
              Editar
            </Button>
          </div>
        </div>
      );
    },
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#F4F4F5]">
            Gestión de precios
          </h2>
          {tcVigente ? (
            <p className="text-sm text-[#A1A1AA]">
              TC vigente:{' '}
              <span className="font-mono text-[#00F5A0]">
                ${tcVigente.toFixed(2)}
              </span>
            </p>
          ) : (
            <p className="text-sm text-red-400">No hay TC cargado.</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={onRecalcular}
            isLoading={isLoading}
            leftIcon={<span>🔄</span>}
          >
            Recalcular automáticos
          </Button>
          <Button variant="primary" onClick={onEdicionMasiva}>
            Edición masiva
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-[#52525B]">
          <Loader size="sm" color="violet" />
          Procesando precios...
        </div>
      )}

      <Table<VarianteConPrecios>
        columns={[...columnasBase, ...columnasListas]}
        data={variantes}
        keyExtractor={(v) => v.id}
        emptyMessage="No hay variantes para mostrar. Cargá productos y variantes primero."
      />
    </div>
  );
}

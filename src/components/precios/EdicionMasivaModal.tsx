import * as React from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { ListaPrecioRow } from '../../types/precios';

interface EdicionMasivaModalProps {
  isOpen: boolean;
  onClose: () => void;
  listas: ListaPrecioRow[];
  onAplicar: (listaId: string, costoUsd: number, precioArs: number) => Promise<void>;
}

export function EdicionMasivaModal({
  isOpen,
  onClose,
  listas,
  onAplicar,
}: EdicionMasivaModalProps) {
  const [listaId, setListaId] = React.useState('');
  const [costoUsd, setCostoUsd] = React.useState('');
  const [precioArs, setPrecioArs] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setListaId(listas[0]?.id ?? '');
      setCostoUsd('');
      setPrecioArs('');
      setError(null);
    }
  }, [isOpen, listas]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!listaId) {
      setError('Seleccioná una lista de precios.');
      return;
    }

    const costo = Number(costoUsd.replace(',', '.'));
    const precio = Number(precioArs.replace(',', '.'));

    if (Number.isNaN(costo) || costo < 0) {
      setError('El costo en USD debe ser un número válido.');
      return;
    }
    if (Number.isNaN(precio) || precio < 0) {
      setError('El precio en ARS debe ser un número válido.');
      return;
    }

    setLoading(true);
    try {
      await onAplicar(listaId, costo, precio);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al aplicar precios.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-[#1F1F23] bg-[#121214] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#F4F4F5]">
            Edición masiva de precios
          </h3>
          <Button size="sm" variant="ghost" onClick={onClose}>
            ✕
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#A1A1AA]">
              Lista de precios
            </label>
            <select
              value={listaId}
              onChange={(e) => setListaId(e.target.value)}
              className="w-full rounded-md border border-[#1F1F23] bg-[#161619] px-3 py-2 text-sm text-[#F4F4F5] focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
            >
              {listas.map((lista) => (
                <option key={lista.id} value={lista.id}>
                  {lista.nombre} (+{(lista.margen * 100).toFixed(0)}%)
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Costo USD exacto de las variantes"
            type="number"
            step="0.01"
            min="0"
            placeholder="Ej: 4.50"
            value={costoUsd}
            onChange={(e) => setCostoUsd(e.target.value)}
            inputSize="md"
          />

          <Input
            label="Nuevo precio ARS a aplicar"
            type="number"
            step="0.01"
            min="0"
            placeholder="Ej: 7312.50"
            value={precioArs}
            onChange={(e) => setPrecioArs(e.target.value)}
            inputSize="md"
          />

          {error && <p className="text-sm font-medium text-red-400">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={loading}>
              Aplicar a todas
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

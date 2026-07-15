import * as React from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Loader } from '../ui/Loader';
import { cargarTipoCambio } from '../../services/preciosService';
import type { TipoCambioRow } from '../../types/precios';

interface TipoCambioFormProps {
  onCargado?: (tc: TipoCambioRow) => void;
}

export function TipoCambioForm({ onCargado }: TipoCambioFormProps) {
  const [valor, setValor] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [exito, setExito] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setExito(null);

    const valorNumerico = Number(valor.replace(',', '.'));
    if (Number.isNaN(valorNumerico) || valorNumerico <= 0) {
      setError('El tipo de cambio debe ser un número mayor a cero.');
      return;
    }

    setLoading(true);
    try {
      const tc = await cargarTipoCambio({ valor: valorNumerico });
      setExito(`TC cargado: $${tc.valor.toFixed(2)}`);
      setValor('');
      onCargado?.(tc);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el TC.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-lg border border-[#1F1F23] bg-[#121214] p-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-[#F4F4F5]">
          Cargar tipo de cambio
        </h3>
        {loading && <Loader size="sm" color="violet" />}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            label="Valor del dólar (ARS)"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Ej: 1250.00"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            error={error ?? undefined}
            inputSize="md"
          />
        </div>

        <Button type="submit" disabled={loading} className="sm:w-auto w-full">
          Guardar TC
        </Button>
      </div>

      {exito && (
        <p className="text-sm font-medium text-[#00F5A0]">{exito}</p>
      )}
    </form>
  );
}

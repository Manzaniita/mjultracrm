import { ValidationError } from './errors';

export function validarNombre(nombre: unknown, campo = 'Nombre'): string {
  if (typeof nombre !== 'string') {
    throw new ValidationError(`${campo} debe ser un texto.`);
  }
  const limpio = nombre.trim();
  if (limpio.length === 0) {
    throw new ValidationError(`${campo} es obligatorio.`);
  }
  if (limpio.length > 200) {
    throw new ValidationError(`${campo} no puede superar los 200 caracteres.`);
  }
  return limpio;
}

export function validarId(id: unknown, campo = 'ID'): string {
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new ValidationError(`${campo} debe ser un identificador válido.`);
  }
  return id.trim();
}

export function validarMontoPositivo(
  valor: unknown,
  campo = 'Monto'
): number {
  if (typeof valor !== 'number' || Number.isNaN(valor)) {
    throw new ValidationError(`${campo} debe ser un número válido.`);
  }
  if (valor < 0) {
    throw new ValidationError(`${campo} no puede ser negativo.`);
  }
  return valor;
}

export function validarCantidadPositivaEntera(
  valor: unknown,
  campo = 'Cantidad'
): number {
  if (typeof valor !== 'number' || Number.isNaN(valor)) {
    throw new ValidationError(`${campo} debe ser un número válido.`);
  }
  if (!Number.isInteger(valor) || valor <= 0) {
    throw new ValidationError(`${campo} debe ser un número entero mayor a cero.`);
  }
  return valor;
}

export function validarOpcionalMontoNoNegativo(
  valor: unknown,
  campo = 'Monto'
): number {
  const numero = typeof valor === 'number' ? valor : Number(valor);
  if (Number.isNaN(numero)) {
    throw new ValidationError(`${campo} debe ser un número válido.`);
  }
  if (numero < 0) {
    throw new ValidationError(`${campo} no puede ser negativo.`);
  }
  return numero;
}

export function validarListaIds(ids: unknown[], campo = 'lista de IDs'): string[] {
  if (!Array.isArray(ids)) {
    throw new ValidationError(`${campo} debe ser un arreglo.`);
  }
  return ids.map((id, i) => {
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new ValidationError(`${campo}: el elemento ${i + 1} no es un ID válido.`);
    }
    return id.trim();
  });
}

export function validarSku(sku: unknown): string | null {
  if (sku === null || sku === undefined) return null;
  if (typeof sku !== 'string') {
    throw new ValidationError('SKU debe ser un texto o nulo.');
  }
  const limpio = sku.trim();
  return limpio.length === 0 ? null : limpio;
}

/**
 * Clases de error y helper para traducir errores de Supabase
 * a mensajes claros en español.
 */

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'UNKNOWN',
    public readonly status?: number
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class AuthError extends AppError {
  constructor(message: string, code: string = 'AUTH_ERROR', status?: number) {
    super(message, code, status);
    this.name = 'AuthError';
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

export class CatalogoError extends AppError {
  constructor(message: string, code: string = 'CATALOG_ERROR') {
    super(message, code);
    this.name = 'CatalogoError';
    Object.setPrototypeOf(this, CatalogoError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code: string = 'VALIDATION_ERROR') {
    super(message, code);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export interface SupabaseErrorLike {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
}

export function handleSupabaseError(error: SupabaseErrorLike | null | undefined): never {
  if (!error) {
    throw new AppError('Error desconocido al comunicarse con Supabase.');
  }

  const rawMessage =
    error.message || error.details || error.hint || JSON.stringify(error);
  const code = error.code || 'UNKNOWN';

  // Violación de unique constraint
  if (code === '23505') {
    throw new CatalogoError(
      'Ya existe un registro con esos datos. Verificá que el nombre/identificador sea único.',
      code
    );
  }

  // Violación de foreign key
  if (code === '23503') {
    throw new CatalogoError(
      'No se puede realizar la operación porque el registro está referenciado por otro dato (por ejemplo, una variante en una venta o consignación).',
      code
    );
  }

  // Violación de check constraint
  if (code === '23514') {
    throw new CatalogoError(
      'Los datos no cumplen una regla de negocio (por ejemplo, un precio o stock negativo).',
      code
    );
  }

  // Not null violation
  if (code === '23502') {
    throw new ValidationError(
      'Faltan datos obligatorios para completar la operación.',
      code
    );
  }

  // RLS / permisos
  if (code === '42501' || code === 'PGRST301' || rawMessage.toLowerCase().includes('row-level')) {
    throw new AuthError(
      'No tenés permisos para realizar esta acción.',
      code,
      403
    );
  }

  // No encontrado (PostgREST)
  if (code === 'PGRST116') {
    throw new CatalogoError('No se encontró el registro solicitado.', code);
  }

  throw new AppError(rawMessage, code, error.status);
}

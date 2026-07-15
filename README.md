# MJUltraCRM

Aplicación PWA para la gestión de stock, consignaciones, ventas, cobros y caja, construida con **React**, **TypeScript**, **Vite**, **Tailwind CSS** y **Supabase**.

## Requisitos previos

- Node.js 18+
- npm, yarn o pnpm
- Proyecto Supabase (gratuito en [supabase.com](https://supabase.com))

## Instalación

```bash
npm install
```

## Variables de entorno

Copiá el archivo de ejemplo y completá con tus credenciales de Supabase:

```bash
cp .env.example .env
```

Variables necesarias:

- `VITE_SUPABASE_URL`: URL del proyecto Supabase
- `VITE_SUPABASE_ANON_KEY`: clave anónima pública del proyecto

## Configuración de Supabase

### 1. Ejecutar migrations

1. Accedé al panel de Supabase.
2. Abrí el **SQL Editor**.
3. Ejecutá los scripts de migración ubicados en `supabase/migrations` en orden numérico creciente:
   - `20260715000000_schema.sql`
   - `20260715000001_functions.sql`

```bash
# Alternativa con la CLI de Supabase
supabase migration up
```

### 2. Crear el usuario administrador inicial

La app no tiene registro público. El primer admin se crea manualmente:

1. En Supabase, andá a **Authentication > Users** y creá un usuario (email + contraseña).
2. En el **SQL Editor**, ejecutá (reemplazando el email):

```sql
insert into public.perfiles (id, nombre, email, rol, activo)
select id, 'Administrador', email, 'admin', true
from auth.users
where email = 'admin@tudominio.com';
```

3. Iniciá sesión en la app con ese usuario.

### 3. Crear reventas

Desde el panel **Usuarios** del admin podés dar de alta reventas. El flujo usa `supabase.auth.signUp` desde el cliente; si tu proyecto tiene confirmación de email deshabilitada, la sesión del admin se cerrará al crear la reventa y deberá volver a iniciar sesión. Para un comportamiento más pulido, recomendamos usar una Edge Function con `service_role` en producción.

## Desarrollo

```bash
npm run dev
```

La aplicación se sirve en `http://localhost:5173` por defecto.

## Build de producción

```bash
npm run build
```

## Deploy en Vercel

1. Importá el repositorio en [Vercel](https://vercel.com).
2. Configurá el framework preset como **Vite**.
3. Agregá las variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en **Settings > Environment Variables**.
4. Ejecutá el deploy. El archivo `vercel.json` redirige todas las rutas a `index.html` para soportar la SPA.

```bash
# Deploy manual con Vercel CLI
vercel --prod
```

## Notas de arquitectura

- **RLS**: toda la seguridad vive en PostgreSQL. Las políticas están definidas en el schema.
- **Stock y caja**: se mantienen mediante triggers sobre `movimientos_stock` y `pagos`.
- **Snapshot USD**: cada venta guarda `total_ars`, `tc_usado` y `total_usd` congelados; el valor en USD nunca se recalcula.
- **Deudas**: se derivan de `ventas.total_ars - sum(pagos.monto_ars)`; no hay tabla separada.

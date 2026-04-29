# aute-meet

Aute Meet es un clon mínimo de Cal.com para el equipo interno de Aute.
Stack: Next.js 16 · TypeScript · Tailwind v4 · shadcn/ui · Supabase Auth + Postgres.

## Setup

1. Copia las variables de entorno:
   ```bash
   cp .env.local.example .env.local
   ```
2. Rellena `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y el resto de variables.
3. En el dashboard de Supabase, añade `http://localhost:3000/auth/callback` como **Redirect URL** autorizada.
4. En Google Cloud Console, añade la misma URL como **Authorized redirect URI** en las credenciales OAuth.

```bash
pnpm dev      # servidor de desarrollo en http://localhost:3000
pnpm build    # build de producción
```

## Manual auth test

Prerrequisito: el proyecto Supabase y las credenciales OAuth de Google deben estar configurados y el servidor corriendo (`pnpm dev`).

### Caso 1 — Usuario @aute.website entra al dashboard

1. Ve a `http://localhost:3000/login`.
2. Pulsa **Continuar con Google** y autentícate con una cuenta `@aute.website`.
3. **Resultado esperado:** redirección a `/dashboard` mostrando tu nombre y email.

### Caso 2 — Usuario de otro dominio es rechazado

1. Ve a `http://localhost:3000/login`.
2. Pulsa **Continuar con Google** y autentícate con una cuenta `@gmail.com` (u otro dominio).
3. **Resultado esperado:** redirección a `/login?error=domain_not_allowed` con el aviso en rojo:
   > "Solo cuentas del dominio @aute.website pueden acceder a Aute Meet…"
4. Verifica que `/dashboard` devuelve redirección a `/login` (sin sesión activa).

### Caso 3 — Usuario sin sesión intenta acceder a /dashboard

1. Abre una ventana de incógnito (sin cookies de sesión).
2. Navega directamente a `http://localhost:3000/dashboard`.
3. **Resultado esperado:** redirección inmediata a `/login`.

### Caso 4 — Usuario logueado cierra sesión

1. Inicia sesión con una cuenta `@aute.website` (caso 1).
2. En el dashboard, pulsa **Cerrar sesión**.
3. **Resultado esperado:** redirección a `/` (landing), sin sesión activa.
4. Navega a `/dashboard` — debe redirigir a `/login`.

---

## Manual calendar connect test

Prerrequisito: `ENCRYPTION_KEY` y credenciales de Google Calendar configuradas en `.env.local`. En Google Cloud Console, añade `http://localhost:3000/api/calendar/google/callback` como **Authorized redirect URI**.

### Paso 1 — Conectar Google Calendar

1. Inicia sesión con una cuenta `@aute.website`.
2. En el dashboard verás la sección **Calendarios conectados** con estado "No conectado".
3. Pulsa **Conectar Google Calendar**.
4. Google mostrará una pantalla de advertencia "aplicación no verificada" → pulsa **Avanzado** → **Ir a [nombre de la app]**.
5. Acepta los permisos de lectura/escritura de Calendar.
6. **Resultado esperado:** redirección al dashboard con banner verde "Google Calendar conectado correctamente" y el email de Google visible en la tarjeta.

### Paso 2 — Verificar cifrado en BBDD

1. Abre Supabase → Table Editor → tabla `calendar_connections`.
2. Localiza la fila de tu usuario.
3. **Resultado esperado:** `access_token` y `refresh_token` tienen formato `<base64>:<base64>:<base64>` (IV:cifrado:authTag), no un JWT crudo.

### Paso 3 — Desconectar

1. En el dashboard, pulsa **Desconectar** en la tarjeta de Google Calendar.
2. **Resultado esperado:** la tarjeta vuelve al estado "No conectado" sin recargar la página (usa `router.refresh()`).
3. Verifica en Supabase que la fila ha sido eliminada de `calendar_connections`.

---

## Smoke test de cifrado

Ejecuta el smoke test del módulo `crypto` sin necesidad de un servidor levantado:

```bash
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") \
  pnpm tsx src/lib/crypto.smoke.ts
```

Salida esperada:

```
✓ Round-trip encrypt/decrypt
✓ Output format iv:ciphertext:authTag
✓ Non-deterministic output (random IV)
✓ Tamper detection (GCM auth tag)

All crypto smoke tests passed.
```

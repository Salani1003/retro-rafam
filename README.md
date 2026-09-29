# Retro — Retrospectivas colaborativas de equipo

Aplicación web para hacer retrospectivas de sprint en equipo: creá una sala, compartí un
enlace, sumen tarjetas en un tablero de cuatro columnas en tiempo real, reaccionen con pulgar
arriba y exporten el resultado a PDF. Sin registro: cada participante entra con su nombre.

## Stack

React + TypeScript + Vite · Tailwind CSS v4 · shadcn/ui (Radix) · Supabase (Postgres + Auth
anónima + Realtime) · React Router · React Hook Form + Zod · TanStack Query · jsPDF +
jspdf-autotable.

## 1. Configurar Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com/dashboard).
2. En **Authentication → Sign In / Providers**, activá **Anonymous Sign-Ins**. Es lo que le da a
   cada participante una identidad persistente sin pedirle email ni contraseña.
3. En **SQL Editor**, ejecutá en orden los archivos de `supabase/migrations/`:
   - `0001_schema.sql` — tablas, índices y restricciones.
   - `0002_functions.sql` — funciones RPC (`create_retrospective`, `join_retrospective`,
     `close_retrospective`, `toggle_reaction`, etc.).
   - `0003_rls.sql` — políticas de Row Level Security. Sin esto, nadie puede leer ni escribir
     nada (por diseño).
   - `0004_realtime.sql` — agrega las tablas a la publicación `supabase_realtime` para que los
     cambios se propaguen a todos los participantes conectados.

   Si preferís usar la CLI de Supabase (`supabase db push` con estas migraciones en
   `supabase/migrations/`), también funciona: el orden numérico ya es el correcto.

4. Realtime ya queda habilitado por la migración `0004`. No hace falta tocar nada más en
   **Database → Replication**.

## 2. Variables de entorno

```bash
cp .env.example .env
```

Completá con los valores de **Project Settings → API** de tu proyecto Supabase:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

Usá siempre la **anon key** (pública). La service role key nunca debe usarse en el frontend: no
se necesita en ningún punto de esta app, porque toda la autorización vive en las políticas RLS
y en las funciones `SECURITY DEFINER`.

## 3. Ejecutar localmente

```bash
npm install
npm run dev
```

Abrí `http://localhost:5173`. Para probar la colaboración en tiempo real, abrí la misma sala en
dos pestañas (o una en modo incógnito) con nombres distintos.

## Scripts

- `npm run dev` — servidor de desarrollo.
- `npm run build` — chequeo de tipos (`tsc -b`) + build de producción.
- `npm run lint` — Oxlint.
- `npm run preview` — sirve el build de producción localmente.

## Cómo funciona la autorización

No hay backend propio: toda la lógica de negocio sensible (crear sala, unirse, cerrar,
reaccionar) vive en funciones Postgres `SECURITY DEFINER` (`supabase/migrations/0002_functions.sql`)
y las políticas RLS (`0003_rls.sql`) garantizan que un participante solo pueda leer o escribir en
las salas a las que se unió. El frontend nunca decide permisos por sí solo, solo refleja lo que
la base de datos ya permite o rechaza.

## Estructura del proyecto

```
src/
├── app/                 # Providers (React Query, Auth, Toaster) y router
├── components/
│   ├── ui/              # Componentes shadcn/ui
│   └── retrospective/   # Tablero, columnas, tarjetas, reacciones, diálogos
├── hooks/                # useAuth, useBoard (estado + Realtime), useConnectionStatus
├── lib/                  # Cliente Supabase, utils, manejo de errores
├── pages/                # WelcomePage, BoardPage, NotFoundPage
├── schemas/              # Validaciones Zod
├── services/              # Acceso a datos (Supabase) por dominio
└── types/                # Tipos de la base de datos y del dominio

supabase/
└── migrations/           # Esquema, funciones RPC, RLS y Realtime, versionados
```

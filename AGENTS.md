Contexto del equipo: ../AGENTS.md. Leerlo primero si no está cargado.

# Cropilot

Monorepo del producto: web, mobile, backend y auth. El core de modelos (suelo, mercado, agua, RL, CV) vive dentro del backend, un módulo por dominio.

## Arquitectura

```
webapp (Vite)  ─┐                  ┌─ /api/auth/*  → auth (Better Auth, Node)
mobile (Expo)  ─┴─ un solo origen ─┤
                                   └─ /api/*       → backend (FastAPI) → Postgres
```

- **Un solo origen.** Traefik en producción y el proxy de Vite en desarrollo enrutan por path. No hay CORS.
- **Auth.** El login es con Google, en `auth`. `auth` emite un JWT de 15 minutos y `backend` lo verifica contra `/api/auth/jwks`. El backend nunca lee las tablas de auth.
- **Contrato.** El OpenAPI del backend genera `packages/api`: cliente, tipos, query options y schemas Zod que usan web y mobile.
- **Base de datos.** Un Postgres con dos dueños: schema `auth` (Better Auth, `apps/auth/src/migrate.ts`) y schema `public` (backend, Alembic).

## Comandos

Desde la raíz:

| Comando                     | Qué hace                                                       |
| --------------------------- | -------------------------------------------------------------- |
| `pnpm dev`                  | Levanta la base, migra y corre backend, auth y web con recarga |
| `pnpm mobile`               | Corre Expo                                                     |
| `pnpm lint` · `pnpm format` | Biome, Ruff (Python) y las reglas visuales de la web           |
| `pnpm typecheck`            | `tsc` y `ty`                                                   |
| `pnpm test`                 | `pytest` y `node --test`                                       |
| `pnpm generate`             | Regenera `packages/api` desde el backend                       |
| `pnpm migrate`              | Aplica las migraciones de backend y auth                       |

- Migración nueva: `cd apps/backend && uv run alembic revision --autogenerate -m "<qué cambia>"`.
- Dependencias: `pnpm --filter @cropilot/<paquete> add <lib>`, `uv add <lib>` en `apps/backend`, `pnpm exec expo install <lib>` en `apps/mobile`.
- Componente de UI: `pnpm dlx shadcn@latest add <componente>` en `apps/webapp` y `pnpm dlx @react-native-reusables/cli@latest add <componente>` en `apps/mobile`, y se adapta al sistema visual antes de usarlo.

## Reglas de código

Valen para todo el repo. El linter, el type checker y los hooks cubren el formato; esto cubre lo que no pueden ver.

- **Reusar antes de escribir.** Antes de crear un helper, un componente o un tipo, buscar si ya existe. Lo que usan dos apps va a `packages/`. Lo que usa una sola se queda en esa app. No se crea una abstracción hasta el segundo uso real.
- **Una sola fuente de verdad.** Los tipos y la validación del API salen de `@cropilot/api`, no se redeclaran. Las versiones compartidas viven en el `catalog` de `pnpm-workspace.yaml`. Cada variable de entorno se declara en `.env.example` y se lee en un único archivo por app (`core/config.py`, `src/env.ts`, `lib/env.ts`).
- **Mínimo.** Sin features fuera del camino del demo, sin capas vacías "por las dudas", sin código muerto ni comentado.
- **Tipos estrictos.** Sin `any`, sin `# type: ignore`, sin `as` para callar al compilador. No se desactiva una regla del linter para que pase: se arregla el código.
- **Fallar temprano.** Un error se propaga con un mensaje claro. No se tragan excepciones ni se inventan valores por defecto.
- **Nombres.** Completos y descriptivos, con la unidad cuando hay una (`precip_mm`). Archivos en kebab-case (TypeScript) y snake_case (Python).
- **Comentarios.** En inglés, solo para explicar el porqué.
- **Datos.** Nunca un número inventado. Lo mock o sintético lo dice en el nombre y en la interfaz. Cada indicador que se muestra lleva su fuente: dataset, período y ubicación.
- **Interfaz en inglés.**
- **No se editan a mano:** `packages/api/src/generated/`, `packages/api/openapi.json`, `routeTree.gen.ts`, `pnpm-lock.yaml`, `uv.lock`.
- **Hooks.** No se saltean con `--no-verify`.

## Backend · `apps/backend/app`

```
core/          config.py · db.py · auth.py      infraestructura compartida
modules/<x>/   router.py → service.py → repository.py · models.py · schemas.py
main.py        registra los routers en ROUTERS
```

- **Dependencias en un solo sentido:** `router → service → repository → models`. `core` no importa de `modules`. Un módulo usa a otro solo a través de su `service`.
- `router.py`: solo HTTP. Declara `response_model`, recibe `CurrentUser` y `SessionDep`, llama a un service. Sin lógica ni SQL.
- `service.py`: reglas de negocio y dueño de la transacción (`commit`). No importa FastAPI: los errores de negocio son excepciones del módulo que el router traduce a HTTP.
- `repository.py`: el único lugar con consultas. Nunca hace `commit`.
- `models.py`: tablas. `schemas.py`: entrada y salida del API. Nunca se devuelve un modelo ORM sin `response_model`.
- **Autorización.** Todo endpoint privado recibe `CurrentUser` y filtra por `user.id`. El dueño de un dato nunca llega desde el cliente.
- **Nombres de endpoints.** El nombre de la función es el nombre en el cliente TypeScript (`list_farms` → `listFarms`): con verbo y único en todo el API.
- **Modelos de ML.** Misma estructura de módulo. El trabajo de CPU (inferencia) nunca corre dentro de un `async def`: va en un endpoint `def` o en `run_in_threadpool`. Los pesos y los datos no van a git: un script los deja en `apps/backend/models/` y `apps/backend/data/`.
- **Schema.** Solo cambia por migración de Alembic autogenerada y revisada. Nunca `create_all`.
- **Tests** en `tests/`, donde un número mal calculado engañaría a un agrónomo (transformaciones, scoring) y en seguridad.

## Web · `apps/webapp/src`

```
routes/          rutas por archivo (TanStack Router). Finas: loader y composición
features/<x>/    componentes, hooks y lógica de un dominio
components/ui/   shadcn. Se agrega con el CLI y se adapta al sistema visual
lib/             clientes y utilidades sin dominio
```

- Las rutas bajo `routes/_authenticated/` exigen sesión y una región en el workspace (`getWorkspaceOptions()`); sin región se va a `/onboarding`, que la elige. Después se cambia con `components/region-dialog.tsx`, que guarda y llama a `router.invalidate()`. El layout pasa `user` y `region` por el contexto de la ruta. Las de `routes/_site/` son el sitio público: la landing y las páginas de sus menús, que salen del catálogo `features/landing/site-content.ts`.
- **Estado de servidor solo con TanStack Query**, con las options generadas (`listFarmsOptions()`, `createFarmMutation()`). Nada de `fetch` ni `useEffect` para traer datos. La ruta precarga con `loader` y `ensureQueryData`; el componente lee con `useSuspenseQuery`.
- **Formularios** con TanStack Form, los schemas Zod generados (`zFarmCreate`) y los componentes `Field`.
- Estado local con `useState`. No se agrega un store global.
- **Estilos** con clases de Tailwind y los tokens del tema (`text-muted-foreground`). Sin colores sueltos ni archivos CSS nuevos. Clases condicionales con `cn`.
- Un feature no importa de otro. Lo compartido sube a `components/` o `lib/`.
- Imports internos con el alias `@/`.

### Sistema visual

Vale para la landing, la plataforma y todo componente de shadcn, nuevo o existente. La referencia es la landing.

- **Color 90/10.** Tinta, grises fríos y blanco. `--primary` es el único acento: acción principal, links, foco, estado activo y resaltados chicos de datos. Sin degradés de color ni otros tonos. La excepción son los colores que codifican un dato, como el cultivo en el mapa, declarados en un solo lugar.
- **Tipografía.** Geist. `font-light tracking-tight` en títulos de página y cifras grandes (desde `text-xl`); `font-medium` en títulos chicos y etiquetas; `font-normal` en texto y botones. Nunca `font-semibold` ni más.
- **Forma.** Los radios salen de `--radius`: 4px en controles (`rounded-lg`), un paso más en tarjetas y paneles (`rounded-xl`). Píldora solo en badges y avatares.
- **Superficies planas.** Lo que está en el flujo de la página lleva borde fino y no lleva sombra. La sombra es para lo que flota: menús, popovers, paneles sobre el mapa. La escala `shadow-*` está redefinida en el tema, así que no se escriben sombras propias.
- **Glass**, solo para capas sobre contenido. Panel: `bg-background/75 backdrop-blur-lg`. Fondo de un modal, sheet o menú: `bg-background/40 backdrop-blur-xs`.
- **Componente nuevo de shadcn.** Después de `shadcn add` se revisa el archivo antes de usarlo: pesos según la regla de arriba, solo tokens de color (se reemplazan `black`, `white` y la paleta de Tailwind) y el fondo de los modales pasa a la receta de glass. No se le agregan radios ni sombras: vienen del tema.
- `pnpm lint` falla si aparece un peso mayor a `font-medium` o un color fuera del tema (`apps/webapp/scripts/check-design-rules.mjs`).

## Mobile · `apps/mobile/src`

- Misma separación: `app/` (pantallas de Expo Router, finas), `features/`, `lib/`.
- Usa el mismo `@cropilot/api` que la web. La lógica sin interfaz que sirva a las dos va a `packages/`.
- La app replica la web a ancho de celular: abre en una bienvenida de una pantalla (`app/index.tsx`) y la landing completa vive en `app/tour.tsx` (secciones en `features/landing/`), las páginas públicas salen de `features/landing/site-content.ts` (copia de la web) en `app/site/[sectionSlug]/[pageSlug].tsx`, y la parte interna usa pestañas inferiores (`app/(tabs)/`) con un encabezado nativo por pestaña. Si la web cambia una sección, se cambia acá también.
- Build de demo: el login (`app/sign-in.tsx`) es decorativo y entra sin sesión. Los diagnósticos de lotes leen `assets/map-data/` (ignorado por Git, se genera con el script de preparación del mapa) a través de `src/features/fields/field-data.ts`. `app/farms.tsx` queda para cuando vuelva el login real.
- Componentes de React Native Reusables en `src/components/ui/`, adaptados al sistema visual de la web: se agregan con su CLI y se ajustan a sus reglas (sección Sistema visual).
- Estilos con clases de NativeWind (Tailwind v3) y los tokens de `src/global.css`, que replican los de `apps/webapp/src/index.css`. Solo modo claro. La navegación nativa toma los mismos valores de `src/lib/theme.ts`: si cambia un token, se cambian los dos.
- `react-native-css-interop` es dependencia directa porque el JSX que genera NativeWind la importa y pnpm no la expone. Su versión es la que fija `nativewind`: se suben juntas.
- React está fijado en el catálogo a la versión que exige el SDK de Expo. Se sube junto con el SDK.

## Contrato de API · `packages/api`

Si cambia un endpoint o un schema: `pnpm generate` y se commitean `openapi.json` y `src/generated/`. CI falla si quedaron desactualizados. Un cambio de contrato pide review.

## Auth · `apps/auth`

- Toda la configuración está en `src/auth.ts`.
- El payload del JWT (`definePayload`) es un contrato con `apps/backend/app/core/auth.py`. Se cambian juntos.

## Antes de abrir un PR

1. `pnpm lint && pnpm typecheck && pnpm test`.
2. Título en Conventional Commits: es el mensaje del squash.
3. Una línea en `../submission.md` por cada dataset, librería, modelo o fragmento copiado que entra.

# Tenerife Activity

Premium international tourism platform for Tenerife experiences.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Package Manager**: pnpm
- **i18n**: next-intl (English-only for now, i18n-ready)

## Getting Started

### Install Dependencies

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Windows Setup

**⚠️ Important for Windows users:**

If your project is located in a OneDrive folder, you may encounter errors like:
```
EINVAL: invalid argument, readlink ...\.next\server\app-paths-manifest.json
```

This happens because OneDrive's virtualized file system doesn't handle symlinks properly, which Next.js uses in the `.next` directory.

**Recommended solutions:**

1. **Move project outside OneDrive** (recommended):
   - Move the project to a local path like `C:\dev\tenerife-activity`
   - This avoids all OneDrive-related issues

2. **Use clean script before dev**:
   ```bash
   pnpm clean:next
   pnpm dev
   ```
   Or use the combined command:
   ```bash
   pnpm dev:clean
   ```
   This automatically cleans the `.next` directory and `node_modules/.cache` before starting the dev server.

3. **Fix webpack runtime errors**:
   If you see errors like `__webpack_modules__[moduleId] is not a function`:
   ```bash
   # Stop the dev server (Ctrl+C)
   pnpm clean:next
   pnpm dev
   ```
   This clears corrupted Next.js build cache that can cause module loading issues.

3. **Fix tailwind-merge vendor chunk error**:
   If you see errors like `Cannot find module './vendor-chunks/tailwind-merge@2.6.0.js'`, this is usually a corrupted Next.js cache on Windows. Run:
   ```bash
   pnpm clean
   pnpm install
   pnpm dev
   ```
   The clean script now also removes `node_modules/.cache` which often contains corrupted vendor chunks.

3. **Manual clean if needed**:
   ```bash
   pnpm clean
   ```
   Removes the `.next` directory. Use `pnpm clean:all` to also remove `node_modules`.

**Quick fix if you see the error:**
1. Stop the dev server (Ctrl+C)
2. Run `pnpm clean`
3. Run `pnpm dev` again

### Linting

```bash
pnpm lint
```

### Type Checking

```bash
pnpm typecheck
```

### Formatting

```bash
pnpm format
```

## Project Structure

```
src/
├── app/          # Next.js pages (routes)
├── core/         # Domain layer (entities, ports)
├── data/         # Data layer (mock, tracking)
├── ui/           # UI components (presentation)
└── config/       # Configuration (repositories, tracking)
```

## Architecture

Clean Architecture with separation of concerns:
- **Domain Layer**: Pure business logic (API-agnostic)
- **Data Layer**: Swappable providers (mock → API)
- **UI Layer**: Presentation only
- **App Layer**: Orchestration

## Layout System

All pages must use the layout primitives:
- `Section`: Controls vertical rhythm
- `Container`: Controls width and centering
- `Stack`: Flexbox layouts

See `LAYOUT_SYSTEM.md` for detailed specifications.

## Environment Variables

The application requires environment variables for the Atlantico API integration.

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in the required values (see `.env.example` for details)

3. See `docs/env.md` for complete documentation of all environment variables.

**Required variables:**
- `ATLANTICO_BASE_URL`: Base URL for the Atlantico API proxy

**Optional variables:**
- `ATLANTICO_TIMEOUT_MS`: Request timeout (default: 10000ms)
- `ATLANTICO_REVALIDATE_SECONDS`: Cache revalidation time (default: 300s)
- `ATLANTICO_TOKEN`: API authentication token (if required)









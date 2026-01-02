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









# Tenerife Activity — Architecture Proposal

## Executive Summary

This document outlines the technical architecture for Tenerife Activity, a premium international tourism platform. The architecture is designed to support:
- Professional operator partnerships and API integration
- Scalable, maintainable codebase
- International expansion (i18n-ready)
- SEO excellence
- Commission tracking and analytics

---

## 1. Project Structure (Clean Architecture)

```
tenerife-activity/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (routes)/                 # Route groups
│   │   │   ├── page.tsx              # Home
│   │   │   ├── vibe/
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx      # Vibe listing
│   │   │   ├── experience/
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx      # Experience detail
│   │   │   └── booking/
│   │   │       └── page.tsx          # Booking CTA
│   │   ├── layout.tsx                # Root layout
│   │   ├── sitemap.ts                # Dynamic sitemap
│   │   └── robots.ts                 # Robots.txt
│   │
│   ├── domain/                       # Business logic (API-agnostic)
│   │   ├── entities/                 # Core domain models
│   │   │   ├── experience.ts
│   │   │   ├── vibe.ts
│   │   │   └── booking.ts
│   │   ├── services/                 # Domain services
│   │   │   ├── experience.service.ts
│   │   │   ├── vibe.service.ts
│   │   │   └── booking.service.ts
│   │   └── repositories/             # Repository interfaces
│   │       ├── experience.repository.ts
│   │       └── vibe.repository.ts
│   │
│   ├── data/                         # Data layer (swappable)
│   │   ├── providers/                # Data providers
│   │   │   ├── mock/                 # Mock data (current)
│   │   │   │   ├── mock-experience.provider.ts
│   │   │   │   └── mock-vibe.provider.ts
│   │   │   └── api/                  # Future API integration
│   │   │       ├── api-experience.provider.ts
│   │   │       └── api-vibe.provider.ts
│   │   ├── repositories/             # Repository implementations
│   │   │   ├── experience.repository.impl.ts
│   │   │   └── vibe.repository.impl.ts
│   │   └── mocks/                    # Mock data files
│   │       ├── experiences.json
│   │       └── vibes.json
│   │
│   ├── ui/                           # UI components (presentation)
│   │   ├── components/               # Reusable components
│   │   │   ├── layout/               # Layout primitives
│   │   │   │   ├── Section.tsx
│   │   │   │   ├── Container.tsx
│   │   │   │   └── Grid.tsx
│   │   │   ├── experience/           # Experience components
│   │   │   │   ├── ExperienceCard.tsx
│   │   │   │   ├── ExperienceHero.tsx
│   │   │   │   └── ExperienceGallery.tsx
│   │   │   ├── vibe/                 # Vibe components
│   │   │   │   ├── VibeCard.tsx
│   │   │   │   └── VibeHero.tsx
│   │   │   ├── navigation/           # Navigation components
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   └── Breadcrumbs.tsx
│   │   │   ├── booking/              # Booking components
│   │   │   │   ├── BookingCTA.tsx
│   │   │   │   └── BookingForm.tsx
│   │   │   └── shared/               # Shared primitives
│   │   │       ├── Button.tsx
│   │   │       ├── Link.tsx
│   │   │       ├── Typography.tsx
│   │   │       └── Image.tsx
│   │   └── lib/                      # UI utilities
│   │       └── cn.ts                 # Class name utilities
│   │
│   ├── lib/                          # Shared utilities
│   │   ├── i18n/                     # i18n setup (future-ready)
│   │   │   └── config.ts
│   │   ├── seo/                      # SEO utilities
│   │   │   ├── metadata.ts
│   │   │   └── sitemap.ts
│   │   ├── tracking/                 # Analytics/tracking
│   │   │   ├── commission.ts
│   │   │   └── events.ts
│   │   └── utils/                    # General utilities
│   │       └── format.ts
│   │
│   └── styles/                       # Global styles
│       ├── globals.css
│       └── design-system.css        # Design tokens
│
├── public/                           # Static assets
│   ├── images/
│   └── icons/
│
├── types/                            # Global TypeScript types
│   └── index.ts
│
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 2. Architecture Principles

### 2.1 Separation of Concerns

- **Domain Layer**: Pure business logic, no dependencies on UI or data sources
- **Data Layer**: Implements repository interfaces, swappable (mock → API)
- **UI Layer**: Presentation only, receives data via props/hooks
- **App Layer**: Orchestrates domain services and UI components

### 2.2 Dependency Flow

```
App (pages) → Domain Services → Repositories → Data Providers
     ↓
UI Components (receive data via props/hooks)
```

**Rule**: Dependencies flow inward. Domain never depends on UI or data implementations.

### 2.3 API Integration Strategy

- Repository pattern abstracts data sources
- Current: Mock providers implement repository interfaces
- Future: API providers implement same interfaces
- Zero UI changes required when swapping data sources

---

## 3. Layout System Definition

### 3.1 Core Components

#### `Section`
- **Purpose**: Controls vertical rhythm and section-level spacing
- **Props**:
  - `variant?: 'default' | 'tight' | 'loose' | 'hero'` (vertical padding)
  - `background?: 'default' | 'subtle' | 'accent'` (background color)
  - `children`: ReactNode
- **Rules**:
  - Always full-width
  - Never defines horizontal constraints
  - Never defines max-width
  - Only controls vertical spacing and background

#### `Container`
- **Purpose**: Controls horizontal width, centering, and responsive padding
- **Props**:
  - `size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'` (max-width)
  - `padding?: boolean` (horizontal padding on mobile)
  - `children`: ReactNode
- **Rules**:
  - Always centered (mx-auto)
  - Defines max-width based on size prop
  - Never defines vertical spacing
  - Never defines background
  - Must be nested inside Section

#### `Grid`
- **Purpose**: Responsive grid layouts
- **Props**:
  - `cols?: { base: number; md: number; lg: number }`
  - `gap?: 'sm' | 'md' | 'lg'`
  - `children`: ReactNode
- **Rules**:
  - Only for multi-column layouts
  - Never defines spacing outside grid items

### 3.2 Layout Contract

**Every page MUST follow this pattern:**

```tsx
<Section variant="...">
  <Container size="...">
    {/* Content */}
  </Container>
</Section>
```

**Forbidden patterns:**
- ❌ Page-level max-width definitions
- ❌ Component-level margin/padding that breaks alignment
- ❌ Inline styles for layout
- ❌ Arbitrary spacing utilities outside the system

### 3.3 Responsive Breakpoints

- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

Container sizes:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `full`: 100%

---

## 4. Design System Skeleton

### 4.1 Typography System

**Components:**
- `Typography` (base component)
  - Variants: `h1`, `h2`, `h3`, `h4`, `body`, `small`, `caption`
  - Props: `variant`, `as?`, `color?`, `weight?`

**Tokens:**
- Font families: Primary (serif/sans-serif), Secondary
- Font sizes: Scale from 12px to 48px
- Line heights: Tight (1.2), Normal (1.5), Relaxed (1.75)
- Font weights: 400, 500, 600, 700

### 4.2 Color System

**Tokens:**
- Primary: Neutral palette (grays, blacks, whites)
- Accent: Subtle accent color (not saturated)
- Semantic: Success, warning, error (minimal use)
- Background: Default, subtle, accent variants

**Rules:**
- No saturated colors
- No decorative borders
- Premium, sober aesthetic

### 4.3 Spacing System

**Tokens:**
- Base unit: 4px
- Scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128
- Used consistently via Tailwind utilities

### 4.4 Component Library

#### Layout Primitives
1. `Section` — Vertical rhythm control
2. `Container` — Width and centering
3. `Grid` — Responsive grid layouts

#### Navigation
4. `Header` — Main navigation
5. `Footer` — Site footer
6. `Breadcrumbs` — Navigation breadcrumbs

#### Experience Components
7. `ExperienceCard` — Experience preview card
8. `ExperienceHero` — Experience detail hero section
9. `ExperienceGallery` — Image gallery
10. `ExperienceDetails` — Details section
11. `ExperienceHighlights` — Key highlights list

#### Vibe Components
12. `VibeCard` — Vibe category card
13. `VibeHero` — Vibe listing hero
14. `VibeGrid` — Grid of experiences within vibe

#### Booking Components
15. `BookingCTA` — Primary booking call-to-action
16. `BookingForm` — Booking form (future)

#### Shared Primitives
17. `Button` — Button component (variants: primary, secondary, ghost)
18. `Link` — Link component (no blue underline)
19. `Image` — Optimized image component
20. `Badge` — Badge/tag component
21. `Price` — Price display component
22. `Rating` — Rating display component

---

## 5. SEO Strategy

### 5.1 Metadata Management
- Dynamic metadata per page (experience, vibe)
- Open Graph and Twitter Card support
- Structured data (JSON-LD) for experiences

### 5.2 Sitemap
- Dynamic sitemap generation
- Includes all vibes and experiences
- Priority and changefreq configuration

### 5.3 Robots.txt
- Allow all crawlers
- Sitemap reference

### 5.4 URL Structure
- Clean, semantic URLs: `/vibe/[slug]`, `/experience/[slug]`
- Slug-based routing (SEO-friendly)

---

## 6. Internationalization (i18n-Ready)

### 6.1 Architecture
- i18n library setup (next-intl or similar)
- Locale-based routing: `/en/...`, `/es/...`, `/de/...`
- Translation files structure: `messages/[locale].json`

### 6.2 Current State
- English only for now
- All text content externalized (no hardcoded strings)
- Components accept text via props (future: from i18n hooks)

---

## 7. Tracking & Commission Logic

### 7.1 Tracking Events
- Experience views
- Booking clicks
- Vibe navigation
- Search interactions

### 7.2 Commission Tracking
- Pluggable commission service
- Tracks booking referrals
- Ready for operator API integration

---

## 8. Technology Stack

### Core
- **Framework**: Next.js 14+ (App Router only)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Package Manager**: npm/pnpm/yarn (TBD)

### Development
- **Linting**: ESLint
- **Formatting**: Prettier
- **Type Checking**: TypeScript strict

### Future Considerations
- **i18n**: next-intl or next-i18next
- **Analytics**: Pluggable (GA4, custom)
- **API Client**: tRPC or REST client (TBD based on operator API)

---

## 9. Data Flow Example

### Experience Detail Page

```
1. Page component (app/experience/[slug]/page.tsx)
   ↓
2. Domain service (domain/services/experience.service.ts)
   ↓
3. Repository interface (domain/repositories/experience.repository.ts)
   ↓
4. Repository implementation (data/repositories/experience.repository.impl.ts)
   ↓
5. Data provider (data/providers/mock/mock-experience.provider.ts)
   ↓
6. Returns data to service → page → UI components
```

**Benefits:**
- UI never knows about mock vs API
- Easy to swap data source
- Testable at each layer

---

## 10. Next Steps (After Validation)

1. Initialize Next.js project with TypeScript
2. Set up Tailwind CSS with design tokens
3. Implement layout system (Section, Container, Grid)
4. Create design system components (Typography, Button, Link, etc.)
5. Set up domain layer (entities, services, repositories)
6. Implement mock data providers
7. Build page structure (Home → Vibe → Experience → Booking)
8. Implement SEO (metadata, sitemap, robots.txt)
9. Add tracking hooks (pluggable)

---

## Questions for Validation

1. **Package Manager**: npm, pnpm, or yarn?
2. **i18n Library**: Preference for next-intl vs next-i18next?
3. **Image Optimization**: Next.js Image component sufficient, or external CDN?
4. **Analytics**: Any specific tracking requirements beyond commission tracking?
5. **API Contract**: Any known operator API specifications to align with?

---

**Document Version**: 1.0  
**Date**: 2024  
**Status**: Awaiting Validation









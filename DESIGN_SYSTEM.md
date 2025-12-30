# Design System — Component Skeleton

## Overview

This document defines the component library structure for Tenerife Activity. Components are organized by purpose and follow a premium, sober aesthetic.

**Design Principles:**
- Premium, international aesthetic
- Sober color palette (no saturation)
- No decorative borders
- No blue underlined links
- Consistent spacing and typography
- Professional, credible appearance

---

## Component Categories

### 1. Layout Primitives

#### `Section`
- Controls vertical rhythm
- Full-width container
- Background variants
- **Status**: Core component

#### `Container`
- Width and centering control
- Responsive padding
- **Status**: Core component

#### `Grid`
- Responsive grid layouts
- Configurable columns and gaps
- **Status**: Core component

---

### 2. Typography System

#### `Typography`
Base typography component with semantic variants.

**Props:**
```typescript
interface TypographyProps {
  variant: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'small' | 'caption'
  as?: keyof JSX.IntrinsicElements // Override HTML tag
  color?: 'default' | 'muted' | 'accent'
  weight?: 'normal' | 'medium' | 'semibold' | 'bold'
  children: ReactNode
}
```

**Variants:**
- `h1`: 48px / 1.2 / 700 (hero titles)
- `h2`: 36px / 1.2 / 600 (section titles)
- `h3`: 28px / 1.3 / 600 (subsection titles)
- `h4`: 20px / 1.4 / 600 (card titles)
- `body`: 16px / 1.6 / 400 (body text)
- `small`: 14px / 1.5 / 400 (secondary text)
- `caption`: 12px / 1.4 / 400 (labels, captions)

**Status**: Core component

---

### 3. Navigation Components

#### `Header`
Main site navigation header.

**Features:**
- Logo
- Main navigation links
- Mobile menu (hamburger)
- Sticky behavior (optional)

**Props:**
```typescript
interface HeaderProps {
  sticky?: boolean
}
```

**Status**: Required for all pages

---

#### `Footer`
Site footer with links and information.

**Features:**
- Footer links (legal, about, contact)
- Social links (optional)
- Copyright notice
- Multi-column layout

**Status**: Required for all pages

---

#### `Breadcrumbs`
Navigation breadcrumbs for deep pages.

**Props:**
```typescript
interface BreadcrumbsProps {
  items: Array<{ label: string; href?: string }>
}
```

**Status**: Used on experience and vibe pages

---

### 4. Experience Components

#### `ExperienceCard`
Card component for experience previews in listings.

**Props:**
```typescript
interface ExperienceCardProps {
  experience: Experience
  variant?: 'default' | 'featured'
  onClick?: () => void
}
```

**Features:**
- Image
- Title
- Short description
- Price
- Rating (if available)
- CTA button

**Status**: Core component

---

#### `ExperienceHero`
Hero section for experience detail pages.

**Props:**
```typescript
interface ExperienceHeroProps {
  experience: Experience
}
```

**Features:**
- Large hero image
- Title
- Location
- Key highlights (duration, rating, etc.)
- Primary CTA

**Status**: Required for experience pages

---

#### `ExperienceGallery`
Image gallery for experience detail pages.

**Props:**
```typescript
interface ExperienceGalleryProps {
  images: string[]
}
```

**Features:**
- Main image display
- Thumbnail navigation
- Lightbox (optional)

**Status**: Used on experience detail pages

---

#### `ExperienceDetails`
Detailed information section.

**Props:**
```typescript
interface ExperienceDetailsProps {
  experience: Experience
}
```

**Features:**
- Full description
- What's included
- What's not included
- Important information
- Cancellation policy

**Status**: Used on experience detail pages

---

#### `ExperienceHighlights`
List of key highlights/features.

**Props:**
```typescript
interface ExperienceHighlightsProps {
  highlights: string[]
}
```

**Features:**
- Icon + text list
- Clean, scannable layout

**Status**: Used on experience detail pages

---

### 5. Vibe Components

#### `VibeCard`
Card component for vibe categories.

**Props:**
```typescript
interface VibeCardProps {
  vibe: Vibe
  experienceCount?: number
  onClick?: () => void
}
```

**Features:**
- Vibe image/icon
- Vibe title
- Experience count
- Description (optional)

**Status**: Used on home and vibe listing pages

---

#### `VibeHero`
Hero section for vibe listing pages.

**Props:**
```typescript
interface VibeHeroProps {
  vibe: Vibe
}
```

**Features:**
- Vibe title
- Description
- Visual element (image or icon)

**Status**: Required for vibe pages

---

#### `VibeGrid`
Grid of experiences within a vibe.

**Props:**
```typescript
interface VibeGridProps {
  experiences: Experience[]
  columns?: { base: number; md: number; lg: number }
}
```

**Features:**
- Responsive grid of ExperienceCard components
- Empty state handling

**Status**: Used on vibe listing pages

---

### 6. Booking Components

#### `BookingCTA`
Primary booking call-to-action button/link.

**Props:**
```typescript
interface BookingCTAProps {
  experience: Experience
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
}
```

**Features:**
- Prominent CTA
- Price display (optional)
- Tracking integration
- External link to operator (future)

**Status**: Core component (used throughout)

---

#### `BookingForm`
Booking form component (future implementation).

**Props:**
```typescript
interface BookingFormProps {
  experience: Experience
  onSubmit: (data: BookingData) => void
}
```

**Status**: Future component

---

### 7. Shared Primitives

#### `Button`
Button component with variants.

**Props:**
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  disabled?: boolean
  onClick?: () => void
  children: ReactNode
}
```

**Variants:**
- `primary`: Main action (sober color, no saturation)
- `secondary`: Secondary action
- `ghost`: Tertiary action (minimal styling)

**Status**: Core component

---

#### `Link`
Link component (no blue underline).

**Props:**
```typescript
interface LinkProps {
  href: string
  external?: boolean
  variant?: 'default' | 'muted' | 'accent'
  children: ReactNode
}
```

**Features:**
- No default blue underline
- Hover states
- External link handling
- Next.js Link integration

**Status**: Core component

---

#### `Image`
Optimized image component (Next.js Image wrapper).

**Props:**
```typescript
interface ImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  priority?: boolean
  className?: string
}
```

**Features:**
- Next.js Image optimization
- Lazy loading
- Responsive sizing
- Aspect ratio handling

**Status**: Core component

---

#### `Badge`
Badge/tag component for labels.

**Props:**
```typescript
interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'info'
  children: ReactNode
}
```

**Features:**
- Small, subtle badges
- Color variants (sober palette)

**Status**: Utility component

---

#### `Price`
Price display component.

**Props:**
```typescript
interface PriceProps {
  amount: number
  currency?: string
  variant?: 'default' | 'large' | 'small'
  originalPrice?: number // For discounts
}
```

**Features:**
- Formatted price display
- Currency symbol
- Discount display (strikethrough original)

**Status**: Utility component

---

#### `Rating`
Rating display component.

**Props:**
```typescript
interface RatingProps {
  value: number // 0-5
  count?: number // Review count
  showCount?: boolean
}
```

**Features:**
- Star display
- Review count (optional)
- Accessible markup

**Status**: Utility component

---

## Design Tokens

### Colors

**Primary Palette:**
- Background: White, Gray-50, Gray-100
- Text: Gray-900, Gray-700, Gray-500
- Accent: Subtle accent color (TBD, not saturated)

**Rules:**
- No saturated colors
- Premium, sober aesthetic
- High contrast for readability

---

### Spacing

**Scale:** 4px base unit
- 4, 8, 12, 16, 24, 32, 48, 64, 96, 128

**Usage:**
- Consistent via Tailwind utilities
- No arbitrary values

---

### Typography

**Font Family:**
- Primary: System font stack or premium web font (TBD)
- Secondary: System font stack

**Font Sizes:**
- Scale: 12, 14, 16, 20, 24, 28, 36, 48

**Line Heights:**
- Tight: 1.2 (headings)
- Normal: 1.5 (body)
- Relaxed: 1.75 (long-form)

**Font Weights:**
- 400: Normal
- 500: Medium
- 600: Semibold
- 700: Bold

---

### Borders & Shadows

**Rules:**
- No decorative borders
- Subtle shadows only (if needed)
- Minimal use of borders (functional only)

---

## Component Implementation Order

### Phase 1: Foundation
1. Section
2. Container
3. Grid
4. Typography
5. Button
6. Link
7. Image

### Phase 2: Navigation
8. Header
9. Footer
10. Breadcrumbs

### Phase 3: Experience Components
11. ExperienceCard
12. ExperienceHero
13. ExperienceGallery
14. ExperienceDetails
15. ExperienceHighlights

### Phase 4: Vibe Components
16. VibeCard
17. VibeHero
18. VibeGrid

### Phase 5: Booking & Utilities
19. BookingCTA
20. Price
21. Rating
22. Badge

---

## Component Naming Conventions

- **PascalCase** for component names
- **Descriptive names** (ExperienceCard, not Card)
- **Consistent prefixes** (Experience*, Vibe*, Booking*)
- **No abbreviations** (Button, not Btn)

---

## Accessibility Requirements

All components must:
- Support keyboard navigation
- Include proper ARIA labels where needed
- Maintain color contrast ratios (WCAG AA minimum)
- Support screen readers
- Be focusable where interactive

---

## Status Legend

- **Core component**: Essential, used throughout
- **Required**: Must be implemented for specific pages
- **Utility component**: Supporting component
- **Future component**: Planned but not immediate priority

---

**Document Version**: 1.0  
**Status**: Ready for Implementation








# Layout System — Technical Specification

## Overview

The layout system enforces consistent spacing, alignment, and responsive behavior across all pages. It is built on two core primitives: **Section** and **Container**.

---

## Core Principle

**Every page follows this structure:**

```tsx
<Section variant="...">
  <Container size="...">
    {/* Content */}
  </Container>
</Section>
```

This ensures:
- Perfect centering on all screen sizes
- Consistent vertical rhythm
- No layout drift between pages
- Predictable responsive behavior

---

## Component Specifications

### 1. Section

**Purpose**: Controls vertical rhythm and section-level background.

**Props:**
```typescript
interface SectionProps {
  variant?: 'default' | 'tight' | 'loose' | 'hero'
  background?: 'default' | 'subtle' | 'accent'
  children: ReactNode
}
```

**Variant Spacing:**
- `tight`: py-12 md:py-16 (48px / 64px)
- `default`: py-16 md:py-24 (64px / 96px)
- `loose`: py-24 md:py-32 (96px / 128px)
- `hero`: py-32 md:py-48 (128px / 192px)

**Background Variants:**
- `default`: bg-white (or theme default)
- `subtle`: bg-gray-50 (very subtle)
- `accent`: bg-[accent-color] (minimal use)

**Rules:**
- ✅ Always full-width (`w-full`)
- ✅ Only controls vertical padding
- ✅ Only controls background color
- ❌ Never defines max-width
- ❌ Never defines horizontal padding
- ❌ Never contains content directly (must wrap Container)

**Implementation Pattern:**
```tsx
export function Section({ variant = 'default', background = 'default', children }: SectionProps) {
  return (
    <section className={cn(
      'w-full',
      variantStyles[variant],
      backgroundStyles[background]
    )}>
      {children}
    </section>
  )
}
```

---

### 2. Container

**Purpose**: Controls horizontal width, centering, and responsive horizontal padding.

**Props:**
```typescript
interface ContainerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  padding?: boolean // Horizontal padding on mobile (default: true)
  children: ReactNode
}
```

**Size Max-Widths:**
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `full`: 100% (no max-width)

**Horizontal Padding:**
- Mobile: `px-4` (16px) if `padding={true}`
- Desktop: `px-6` (24px) if `padding={true}`
- Can be disabled with `padding={false}` for edge-to-edge content

**Rules:**
- ✅ Always centered (`mx-auto`)
- ✅ Defines max-width based on size
- ✅ Controls horizontal padding only
- ❌ Never defines vertical spacing
- ❌ Never defines background
- ❌ Must be nested inside Section

**Implementation Pattern:**
```tsx
export function Container({ size = 'lg', padding = true, children }: ContainerProps) {
  return (
    <div className={cn(
      'mx-auto',
      sizeStyles[size],
      padding && 'px-4 md:px-6'
    )}>
      {children}
    </div>
  )
}
```

---

### 3. Grid

**Purpose**: Responsive grid layouts for multi-column content.

**Props:**
```typescript
interface GridProps {
  cols?: {
    base?: number    // Mobile columns (default: 1)
    md?: number      // Tablet columns (default: 2)
    lg?: number      // Desktop columns (default: 3)
  }
  gap?: 'sm' | 'md' | 'lg'
  children: ReactNode
}
```

**Gap Sizes:**
- `sm`: gap-4 (16px)
- `md`: gap-6 (24px)
- `lg`: gap-8 (32px)

**Rules:**
- ✅ Only for multi-column layouts
- ✅ Never defines spacing outside grid items
- ✅ Responsive column count via Tailwind grid classes

**Implementation Pattern:**
```tsx
export function Grid({ cols = { base: 1, md: 2, lg: 3 }, gap = 'md', children }: GridProps) {
  return (
    <div className={cn(
      'grid',
      `grid-cols-${cols.base}`,
      `md:grid-cols-${cols.md}`,
      `lg:grid-cols-${cols.lg}`,
      gapStyles[gap]
    )}>
      {children}
    </div>
  )
}
```

---

## Usage Examples

### Standard Content Section

```tsx
<Section variant="default">
  <Container size="lg">
    <h1>Page Title</h1>
    <p>Content here...</p>
  </Container>
</Section>
```

### Hero Section

```tsx
<Section variant="hero" background="subtle">
  <Container size="xl">
    <h1>Hero Title</h1>
  </Container>
</Section>
```

### Grid Layout

```tsx
<Section variant="default">
  <Container size="lg">
    <Grid cols={{ base: 1, md: 2, lg: 3 }} gap="md">
      <ExperienceCard />
      <ExperienceCard />
      <ExperienceCard />
    </Grid>
  </Container>
</Section>
```

### Edge-to-Edge Content

```tsx
<Section variant="default">
  <Container size="full" padding={false}>
    {/* Full-width image or component */}
  </Container>
</Section>
```

---

## Forbidden Patterns

### ❌ Page-Level Layout Rules

```tsx
// WRONG
export default function Page() {
  return (
    <div className="max-w-7xl mx-auto px-4">
      {/* Content */}
    </div>
  )
}
```

**Why**: Breaks the layout system contract. Use Section + Container.

---

### ❌ Component-Level Layout Hacks

```tsx
// WRONG
export function ExperienceCard() {
  return (
    <div className="max-w-md mx-auto mb-8">
      {/* Content */}
    </div>
  )
}
```

**Why**: Components should not define their own layout constraints. Layout is controlled by Section/Container/Grid.

---

### ❌ Arbitrary Spacing

```tsx
// WRONG
<Section variant="default">
  <Container size="lg">
    <div className="mt-12 mb-20">
      {/* Content */}
    </div>
  </Container>
</Section>
```

**Why**: Use Section variants for vertical spacing. Avoid arbitrary margins.

---

### ❌ Inline Layout Styles

```tsx
// WRONG
<div style={{ maxWidth: '1200px', margin: '0 auto' }}>
  {/* Content */}
</div>
```

**Why**: Always use Container component for consistency.

---

## Responsive Behavior

### Breakpoints

- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### Container Behavior

- **Mobile (< 768px)**: Full width with horizontal padding
- **Tablet (768px - 1024px)**: Max-width with padding
- **Desktop (> 1024px)**: Max-width with padding

### Section Behavior

- **Mobile**: Smaller vertical padding
- **Desktop**: Larger vertical padding (via variant)

---

## Alignment Guarantees

When using Section + Container:

1. **Horizontal Centering**: All content is perfectly centered on all screen sizes
2. **Vertical Rhythm**: Consistent spacing between sections
3. **Responsive Padding**: Appropriate padding on mobile and desktop
4. **No Layout Drift**: Pages maintain consistent alignment

---

## Testing Checklist

Before implementing any page, verify:

- [ ] Page uses Section + Container structure
- [ ] No page-level max-width definitions
- [ ] No component-level layout constraints
- [ ] No arbitrary spacing utilities
- [ ] Content is centered on all breakpoints
- [ ] Vertical rhythm is consistent with other pages

---

**Document Version**: 1.0  
**Status**: Ready for Implementation








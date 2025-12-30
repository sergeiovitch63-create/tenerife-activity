# Logo Trimming Instructions

## Problem
The logo PNG (`/public/logo.png`) has excessive transparent padding, making the visible logo appear tiny even when the container is large.

## Solution Options

### Option A: Automated Trim (Recommended)

**Prerequisites:**
```bash
pnpm add -D sharp
```

**Run the script:**
```bash
node scripts/trim-logo.mjs
```

This will:
1. Analyze the logo dimensions
2. Trim transparent padding automatically
3. Create `logo-tight.png` in `/public/`
4. Show before/after dimensions

**After trimming:**
1. Review `logo-tight.png` visually
2. If it looks good, replace `logo.png` with `logo-tight.png`:
   ```bash
   mv public/logo-tight.png public/logo.png
   ```
3. Update `Header.tsx` to remove scale transform and debug outlines

---

### Option B: Manual Trim in Canva

**Steps:**

1. **Open Canva** and create a new design
   - Use custom dimensions (match your logo's current size, e.g., 280x112px)

2. **Upload your logo**
   - Upload `/public/logo.png`
   - Place it on the canvas

3. **Identify the actual logo bounds**
   - Look for where the actual logo content starts/ends
   - Note the visual boundaries (not transparent areas)

4. **Crop to content**
   - Select the logo element
   - Use Canva's crop tool
   - Drag edges to remove transparent padding
   - Keep only the visible logo content

5. **Export**
   - Click "Download"
   - Format: PNG
   - Transparent background: ✅ Enabled
   - Quality: High
   - Name: `logo.png`

6. **Replace the file**
   - Replace `/public/logo.png` with the new trimmed version

7. **Update Header.tsx**
   - Remove `transform: 'scale(1.75)'` from Image style
   - Remove debug outlines (`outline outline-2 outline-red-500` and `outline outline-2 outline-blue-500`)
   - Remove `onLoadingComplete` logging
   - Update logo container height to final sizes (see below)

---

## Final Header Configuration (After Trim)

Once you have a trimmed logo, update `Header.tsx`:

**Header height:**
- Mobile: `h-[80px]`
- Desktop: `md:h-[90px]`

**Logo container height:**
- Mobile: `h-[48px]`
- Tablet: `md:h-[56px]`
- Desktop: `lg:h-[64px]` or `lg:h-[72px]` (adjust to match Atlántico size)

**Final Brand section (clean):**
```tsx
{/* Brand - Left Group */}
<Link
  href={`/${locale}`}
  className="flex items-center flex-shrink-0"
>
  <div className="h-[48px] md:h-[56px] lg:h-[64px] w-auto flex items-center flex-shrink-0">
    <Image
      src="/logo.png"
      alt="Tenerife Activity"
      width={280}
      height={112}
      className="h-full w-auto object-contain"
      style={{ background: 'transparent' }}
      sizes="(max-width: 768px) 240px, (max-width: 1024px) 320px, 400px"
      priority
    />
  </div>
</Link>
```

**What to remove:**
- ❌ `transform: 'scale(1.75)'` and `transformOrigin: 'left center'`
- ❌ `outline outline-2 outline-red-500 overflow-visible` from wrapper
- ❌ `outline outline-2 outline-blue-500 inline-block` from span
- ❌ `onLoadingComplete` callback
- ❌ `-ml-1 md:-ml-2` (if not needed)
- ❌ `origin-left` from className

---

## Verification

After trimming and updating:

1. **Visual check:**
   - Logo should be clearly visible and readable
   - Size should match Atlántico Excursiones logo prominence
   - No transparent padding visible

2. **Console check:**
   - No debug logs (if removed)
   - No console errors

3. **Layout check:**
   - Logo stays on same header line (no wrap)
   - No flicker on hydration
   - Responsive sizes work correctly

4. **Run checks:**
   ```bash
   pnpm lint
   pnpm typecheck
   ```



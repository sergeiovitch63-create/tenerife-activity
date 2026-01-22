# Booking Buttons Debug & Fix

## Root Cause Identified

**Primary Issue**: The `pointerEvents: 'none'` style was being set on disabled buttons, completely blocking all click events even when buttons appeared enabled.

**Secondary Issue**: The `addItem` function was being called with a fully created `CartItem` object, but the store expects the data object (it creates the item internally).

## Fixes Applied

### 1. Verified Client Component ✅
- Component already has `'use client'` directive on line 8
- All handlers are client-side safe

### 2. Added Debug Instrumentation ✅
- Added `debugClick` handler that logs and shows alert (DEV only)
- Added comprehensive console logging in both handlers
- Added click capture event listener to detect overlays
- Added `elementFromPoint` check on button hover to identify blocking elements
- Added `data-booking-panel-root` attribute for debugging

### 3. Fixed Pointer Events ✅
**Before**:
```tsx
style={{ pointerEvents: readiness.readyForAddToCart && !loadingPrices && !loadingSessions ? 'auto' : 'none' }}
```

**After**:
```tsx
style={{ pointerEvents: 'auto' }}
```

The `disabled` attribute already handles the visual and functional state - we don't need to block pointer events.

### 4. Fixed addItem Call ✅
**Before**:
```tsx
const item = createCartItem({ ... })
addItem(item) // Passing full CartItem
```

**After**:
```tsx
const itemData = { ... } // Data object without auto-generated fields
addItem(itemData) // Store will create the item internally
```

### 5. Enhanced Root Container ✅
- Added `data-booking-panel-root` attribute
- Increased z-index to 50
- Explicit `pointerEvents: 'auto'`

## Files Changed

1. **`src/components/activities/ActivityBookingPanel.tsx`**
   - Added debug instrumentation (DEV only)
   - Fixed `pointerEvents` style (always 'auto')
   - Fixed `addItem` call (pass data object, not created item)
   - Added comprehensive logging
   - Added click capture listener
   - Added hover detection for overlays

## Testing Instructions

1. **Open any activity page** (e.g., `/activities/[slug]`)
2. **Select date, time (if needed), and participants**
3. **Open browser console** (F12)
4. **Click "Add to Cart" button**:
   - Should see alert: "ADD_TO_CART clicked - Check console for details"
   - Console should show: `[BOOKING_PANEL] ADD_TO_CART CLICK` with full state
   - Console should show: `[BOOKING_PANEL] handleAddToCart called`
   - Console should show: `[BOOKING_PANEL] Adding item to cart:`
   - Console should show: `[BOOKING_PANEL] Item added successfully`
   - Toast notification should appear
   - Cart should update

5. **Click "Buy Now" button**:
   - Should see alert: "BUY_NOW clicked - Check console for details"
   - Console should show: `[BOOKING_PANEL] BUY_NOW CLICK` with full state
   - Console should show: `[BOOKING_PANEL] handleBuyNow called`
   - Console should show: `[BOOKING_PANEL] Adding item and navigating to cart:`
   - Console should show: `[BOOKING_PANEL] Navigation triggered`
   - Should navigate to `/cart` page

## Expected Console Output

When clicking a button, you should see:
```
[BOOKING_PANEL] ADD_TO_CART CLICK { disabled: false, pointerEvents: 'auto', readiness: {...}, ... }
[BOOKING_PANEL] handleAddToCart called { disabled: false, readiness: {...}, ... }
[BOOKING_PANEL] Adding item to cart: { t_group: '...', t_id: '...', ... }
[BOOKING_PANEL] Item added successfully
```

## If Alert Does NOT Show

This means click is blocked by overlay:
1. Check console for `[BOOKING_PANEL] CAPTURE` logs
2. Hover over button and check console for `elementAtPoint` - should show the button element
3. If it shows a different element, that's the overlay blocking clicks
4. Remove that overlay or set it to `pointer-events: none`

## If Alert Shows But Cart Doesn't Update

This means handler fires but logic fails:
1. Check console for `[BOOKING_PANEL] Add to Cart blocked:` warning
2. Check `readiness` state - might be missing requirements
3. Check for runtime errors in console
4. Verify cart store is working (check localStorage for 'cart-storage')

## Cleanup (After Verification)

Once confirmed working, remove:
- Alert calls (keep console logs for DEV)
- `elementFromPoint` hover handlers (optional, useful for debugging)

Keep:
- Console logging (helpful for debugging)
- Click capture listener (can be useful)
- All functional fixes

## Confirmation Checklist

- [ ] Clicking "Add to Cart" shows alert (DEV)
- [ ] Console shows click logs
- [ ] Cart updates (check localStorage or cart UI)
- [ ] Toast notification appears
- [ ] Clicking "Buy Now" shows alert (DEV)
- [ ] Console shows click logs
- [ ] Navigation to `/cart` works
- [ ] No runtime errors in console
- [ ] Works on multiple activity pages





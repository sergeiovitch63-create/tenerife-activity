# Maintenance Mode Guide

This document explains how to enable and disable maintenance mode for the website.

## Overview

Maintenance mode shows a maintenance page to all public visitors while allowing localhost access to continue working normally. The maintenance page displays a message and a link to the Tenerife Activity booking page.

## How It Works

- **Public visitors**: See the maintenance page with HTTP 503 status
- **Localhost (127.0.0.1 / ::1)**: Full access to the website (development continues normally)
- **API routes**: Not affected by maintenance mode
- **Static assets**: Not affected by maintenance mode

## Enabling Maintenance Mode

### Method 1: Environment Variable (Recommended for Production)

Set the environment variable `NEXT_PUBLIC_MAINTENANCE_MODE` to `true` or `1`:

**For local development (.env.local):**
```bash
NEXT_PUBLIC_MAINTENANCE_MODE=true
```

**For production hosting:**
- Vercel: Add in Project Settings → Environment Variables
- Other hosting: Set in your hosting platform's environment variable configuration

**Important:** After setting the environment variable, you need to rebuild and redeploy:
```bash
npm run build
npm start
```

### Method 2: Quick Toggle Script (For Local Testing)

Use the provided script to quickly toggle maintenance mode:

```bash
# Enable maintenance mode
node scripts/toggle-maintenance.js enable

# Disable maintenance mode
node scripts/toggle-maintenance.js disable

# Check current status
node scripts/toggle-maintenance.js status
```

This script modifies your `.env.local` file. After running it, restart your dev server.

## Disabling Maintenance Mode

### Method 1: Environment Variable

Remove or set `NEXT_PUBLIC_MAINTENANCE_MODE` to `false` or remove it entirely:

```bash
NEXT_PUBLIC_MAINTENANCE_MODE=false
```

Or remove the line from your `.env.local` file.

**Important:** Rebuild and redeploy after changing the environment variable.

### Method 2: Quick Toggle Script

```bash
node scripts/toggle-maintenance.js disable
```

Then restart your dev server.

## Testing Maintenance Mode

1. **Enable maintenance mode** using one of the methods above
2. **Restart your development server** if using environment variables
3. **Test from localhost**: Visit `http://localhost:3000` - you should see the normal website
4. **Test from another device/network**: Visit the public URL - you should see the maintenance page

## Maintenance Page Details

The maintenance page includes:
- **Message**: Exact text as specified
- **CTA Button**: "Discover Tenerife Activity" linking to the booking page
- **HTTP Status**: 503 Service Unavailable
- **Header**: Retry-After: 3600 (1 hour)
- **Design**: Clean, responsive, minimal design

## Troubleshooting

### Maintenance mode not working?

1. **Check environment variable**: Ensure `NEXT_PUBLIC_MAINTENANCE_MODE=true` is set
2. **Rebuild required**: After changing environment variables, rebuild the application
3. **Check middleware**: Verify `middleware.ts` is properly configured
4. **Clear cache**: Clear browser cache and try again

### Localhost is showing maintenance page?

- Check that you're accessing via `127.0.0.1` or `localhost`
- Verify your IP detection is working (check browser dev tools → Network → Request Headers)
- In some hosting environments, you may need to whitelist your IP address

### Need to allow specific IPs?

Edit `middleware.ts` and add your IP to the `isLocalhost` function or create a whitelist:

```typescript
function isLocalhost(request: NextRequest): boolean {
  // ... existing localhost checks ...
  
  // Add your IP whitelist here
  const whitelistedIPs = ['YOUR_IP_ADDRESS']
  if (whitelistedIPs.includes(ip)) {
    return true
  }
  
  return false
}
```

## Files Modified

- `middleware.ts`: Added maintenance mode check
- `src/app/maintenance/page.tsx`: Maintenance page component

## Security Notes

- Maintenance mode only affects public visitors
- Localhost access is always allowed for development
- API routes are excluded from maintenance mode
- Static assets continue to load normally










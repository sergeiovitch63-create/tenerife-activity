# Atlantico API IP Whitelisting Guide

## Overview

The Atlantico Excursiones API requires IP whitelisting. This means they need to know the **public egress IP address** of the server that makes API calls to their service.

## Important: What IP Does Atlantico Need?

**The IP Atlantico needs is the PUBLIC EGRESS IP of the server making requests (this API route).**

This is NOT:
- Your local development machine IP
- Your office/home IP
- The IP of your database server

This IS:
- The public IP address that Atlantico's servers will see when your Next.js API routes (`/api/atlantico/*`) make requests to their API

## Finding Your Server's Public IP

### Method 1: Use the Built-in Endpoint

We've provided an endpoint to check your server's public IP at runtime:

```
GET /api/atlantico/ip
```

This endpoint calls `https://api.ipify.org?format=json` from your server and returns the public IP address that external services (like Atlantico) will see.

**Usage:**
1. Deploy your application to your production/staging environment
2. Visit `https://your-domain.com/api/atlantico/ip` (or call it via curl/Postman)
3. The response will include the `ip` field - this is what you need to give to Atlantico

**Note for Vercel users:** The `/api/atlantico/ip` endpoint will show a dynamic IP that changes. This endpoint is useful for VPS/self-hosted deployments, but for Vercel you must use a proxy (see `docs/atlantico-vercel.md`).

### Method 2: Manual Check

If you have SSH access to your server, you can run:

```bash
curl https://api.ipify.org?format=json
```

Or use any other IP detection service.

## Deployment Scenarios

### Vercel Deployment

**Important:** Vercel does NOT provide a fixed egress IP address. The IP you see today will be different tomorrow, and IP whitelisting with Atlantico will NOT work reliably.

**You MUST use a proxy with a static IP when deployed on Vercel.**

See `docs/atlantico-vercel.md` for detailed instructions on setting up a proxy for Vercel deployments.

### Self-Hosted / VPS Deployment

If you're hosting on a VPS (DigitalOcean, AWS EC2, Linode, etc.):

1. **Static IP:** Most VPS providers assign a static IP by default
2. **Find the IP:** Use the `/api/atlantico/ip` endpoint or check your server's network configuration
3. **Whitelist:** Provide this IP to Atlantico

### Docker / Container Deployment

If running in containers:

- The IP is the host machine's public IP (or the load balancer's IP if behind one)
- Use the `/api/atlantico/ip` endpoint from within the container to verify
- If behind a load balancer, you may need to whitelist the load balancer's IP range

### Behind a Load Balancer / Reverse Proxy

If your Next.js app is behind a load balancer (AWS ALB, nginx, etc.):

- The IP Atlantico sees is the load balancer's egress IP
- You may need to whitelist multiple IPs if the load balancer uses multiple egress points
- Check your cloud provider's documentation for load balancer IP ranges

## Implementation Notes

### API Routes Location

All Atlantico API wrapper routes are located in:
- `src/app/api/atlantico/*` (App Router)

These routes run server-side only and never expose secrets to the browser.

### Environment Variables

Required environment variables (set in `.env.local` for development, or your deployment platform's environment settings):

```bash
# Direct mode (for VPS/self-hosted with static IP)
ATLANTICO_BASE_URL=https://api.atlanticoexcursiones.com

# Proxy mode (required for Vercel)
ATLANTICO_USE_PROXY=true
ATLANTICO_PROXY_BASE_URL=https://proxy.myserver.com

# Optional (if Atlantico requires authentication)
ATLANTICO_TOKEN=your-api-token-here

# Optional (default: 10000ms)
ATLANTICO_TIMEOUT_MS=10000
```

### Security

- **Never** expose `ATLANTICO_BASE_URL` or `ATLANTICO_TOKEN` to the client
- All API calls are made server-side in API routes
- The configuration module (`src/lib/atlantico/config.ts`) validates that these are only accessed server-side

## Testing

1. **Health Check:**
   ```
   GET /api/atlantico/health
   ```
   Returns basic runtime information.

2. **IP Check:**
   ```
   GET /api/atlantico/ip
   ```
   Returns the server's public IP address.

3. **Catalog (Mock):**
   ```
   GET /api/atlantico/catalog
   ```
   Currently returns mock data. Replace with actual API integration.

## Next Steps

1. Deploy your application to your target environment
2. Call `/api/atlantico/ip` to get your server's public IP
3. Provide this IP to Atlantico for whitelisting
4. Complete the API integration in `/api/atlantico/catalog` (currently returns mock data)
5. Test the integration once IP whitelisting is confirmed

## Troubleshooting

### "Configuration error" when calling API routes

- Ensure `ATLANTICO_BASE_URL` is set in your environment variables
- For local development, create a `.env.local` file
- For production, set it in your deployment platform's environment settings

### IP keeps changing (Vercel)

- **Vercel does not provide static IPs** - you MUST use a proxy with a static IP
- See `docs/atlantico-vercel.md` for proxy setup instructions
- For other serverless platforms, contact your hosting provider about static egress IP options

### API calls fail after IP whitelisting

- Verify the IP using `/api/atlantico/ip` matches what you provided to Atlantico
- Check if Atlantico requires additional authentication headers
- Review server logs for detailed error messages


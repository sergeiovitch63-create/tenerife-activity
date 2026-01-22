# Atlantico API Integration for Vercel Deployments

## Overview

**Vercel does NOT provide a fixed egress IP address.** This means that when your Next.js app (deployed on Vercel) makes API calls to Atlantico, the source IP address will be different on each request. Since Atlantico requires IP whitelisting, **direct API calls from Vercel will NOT work reliably**.

## Solution: Use a Proxy with Static IP

You must route Atlantico API calls through a proxy server that has a static IP address. The proxy will forward requests to Atlantico, and Atlantico will see the proxy's static IP.

## Architecture

```
Vercel (Next.js App) → Proxy Server (VPS with static IP) → Atlantico API
```

1. Your Next.js app on Vercel makes requests to your proxy server
2. The proxy server forwards requests to Atlantico API
3. Atlantico sees the proxy's static IP (which is whitelisted)

## Step-by-Step Setup

### Step 1: Deploy a Proxy Server

You need a VPS (Virtual Private Server) with a static IP address. Popular options:
- DigitalOcean Droplet
- AWS EC2
- Linode
- Hetzner
- Any VPS provider with static IP

**Minimum requirements:**
- Static public IP address
- Node.js runtime (or any HTTP server)
- Ability to forward HTTP requests

### Step 2: Create a Simple Proxy Server

Here's a minimal Node.js proxy server example:

```javascript
// proxy-server.js
const http = require('http');
const https = require('https');

const ATLANTICO_BASE_URL = process.env.ATLANTICO_BASE_URL || 'https://api.atlanticoexcursiones.com';
const PROXY_PORT = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
  // Only allow POST/GET requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  // Optional: Add authentication/authorization here
  // const authHeader = req.headers.authorization;
  // if (!isValidAuth(authHeader)) {
  //   res.writeHead(401, { 'Content-Type': 'application/json' });
  //   res.end(JSON.stringify({ error: 'Unauthorized' }));
  //   return;
  // }

  // Forward the request to Atlantico
  const url = new URL(req.url, ATLANTICO_BASE_URL);
  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname + url.search,
    method: req.method,
    headers: {
      ...req.headers,
      host: url.hostname, // Override host header
    },
  };

  const client = url.protocol === 'https:' ? https : http;
  const proxyReq = client.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
  });

  req.pipe(proxyReq);
});

server.listen(PROXY_PORT, () => {
  console.log(`Proxy server running on port ${PROXY_PORT}`);
  console.log(`Forwarding to: ${ATLANTICO_BASE_URL}`);
});
```

**Deploy this proxy server:**
1. Save the code to your VPS
2. Install Node.js if needed
3. Set `ATLANTICO_BASE_URL` environment variable
4. Run: `node proxy-server.js` (or use PM2: `pm2 start proxy-server.js`)
5. Optionally set up nginx as a reverse proxy for HTTPS

### Step 3: Get Your Proxy Server's IP Address

Find the static IP of your VPS:

```bash
# SSH into your VPS and run:
curl https://api.ipify.org?format=json
```

Or check your VPS provider's dashboard for the public IP address.

### Step 4: Whitelist the Proxy IP with Atlantico

Provide the proxy server's static IP address to Atlantico for whitelisting.

### Step 5: Configure Vercel Environment Variables

In your Vercel project settings, add these environment variables:

```bash
# Enable proxy mode
ATLANTICO_USE_PROXY=true

# Your proxy server URL (use HTTPS if possible)
ATLANTICO_PROXY_BASE_URL=https://your-proxy-server.com

# Optional: Atlantico API token (if required)
ATLANTICO_TOKEN=your-api-token-here

# Optional: Request timeout (default: 10000ms)
ATLANTICO_TIMEOUT_MS=10000
```

**Important:** Do NOT set `ATLANTICO_BASE_URL` when using proxy mode. The proxy will handle forwarding to Atlantico.

### Step 6: Deploy and Test

1. Deploy your Next.js app to Vercel (or trigger a redeploy to pick up new env vars)
2. Test the health endpoint: `GET https://your-app.vercel.app/api/atlantico/health`
3. Test the catalog endpoint: `GET https://your-app.vercel.app/api/atlantico/catalog`

## Security Considerations

### Protect Your Proxy Server

Your proxy server should implement security measures:

1. **Authentication:** Add API key authentication to prevent unauthorized use
   ```javascript
   const PROXY_API_KEY = process.env.PROXY_API_KEY;
   if (req.headers['x-api-key'] !== PROXY_API_KEY) {
     res.writeHead(401, { 'Content-Type': 'application/json' });
     res.end(JSON.stringify({ error: 'Unauthorized' }));
     return;
   }
   ```

2. **Rate Limiting:** Implement rate limiting to prevent abuse

3. **HTTPS:** Use HTTPS for your proxy server (use Let's Encrypt for free SSL)

4. **IP Allowlist:** Optionally restrict which IPs can access your proxy (though Vercel IPs change, so this is difficult)

5. **Request Validation:** Validate and sanitize requests before forwarding

### Environment Variables Security

- Never commit `.env.local` files to git
- Use Vercel's environment variable settings (not in code)
- Rotate API keys and tokens regularly

## Alternative: Use a Managed Proxy Service

If you don't want to manage your own proxy server, consider:

- **Cloudflare Workers** (with static egress IPs on Enterprise plans)
- **AWS API Gateway** (with VPC endpoint)
- **Third-party proxy services** that provide static IPs

However, these may have additional costs. A simple VPS proxy is usually the most cost-effective solution.

## Troubleshooting

### "Configuration error" when calling API routes

- Ensure `ATLANTICO_USE_PROXY=true` is set in Vercel
- Ensure `ATLANTICO_PROXY_BASE_URL` is set and points to your proxy server
- Verify the proxy URL is accessible (try `curl https://your-proxy-server.com`)

### Proxy returns 502/503 errors

- Check if your proxy server is running
- Check proxy server logs for errors
- Verify `ATLANTICO_BASE_URL` is set on the proxy server
- Check network connectivity from proxy to Atlantico

### Requests timeout

- Increase `ATLANTICO_TIMEOUT_MS` in Vercel environment variables
- Check proxy server performance
- Verify Atlantico API is responding

### IP whitelisting still fails

- Verify you whitelisted the **proxy server's IP**, not Vercel's IP
- Check Atlantico's whitelist configuration
- Test direct connection from proxy server to Atlantico: `curl https://api.atlanticoexcursiones.com`

## Cost Estimate

- **VPS with static IP:** ~$5-10/month (DigitalOcean, Hetzner, etc.)
- **Domain for proxy (optional):** ~$10-15/year
- **SSL certificate:** Free (Let's Encrypt)

Total: ~$5-10/month for a reliable proxy solution.

## Summary

1. ✅ Deploy a proxy server on a VPS with static IP
2. ✅ Get the proxy server's static IP address
3. ✅ Whitelist the proxy IP with Atlantico
4. ✅ Set `ATLANTICO_USE_PROXY=true` and `ATLANTICO_PROXY_BASE_URL` in Vercel
5. ✅ Deploy and test

Your Next.js app on Vercel will now route all Atlantico API calls through your proxy, which has a stable IP address that Atlantico can whitelist.




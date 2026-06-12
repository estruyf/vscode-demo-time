# Cloudflare Pages Functions

This directory contains API endpoints for the Demo Time documentation site, compiled to Cloudflare Workers format.

## Available Endpoints

### `/api/sponsor`

GitHub Sponsors verification endpoint. Checks if a user is a sponsor at the required tier ($10+/month).

**Method:** POST  
**Request Body:**
```json
{
  "token": "github_pat_..." 
}
```

**Example:**
```bash
curl -X POST "https://demotime.show/api/sponsor" \
  -H "Content-Type: application/json" \
  -d '{"token":"your_github_token"}'
```

**Response:**
```json
{
  "isSponsor": true
}
```

**Error Responses:**
- `400`: Missing token or GraphQL error
- `500`: Internal server error

## Development

During development, the Pages Functions are automatically compiled by the build process:

```bash
npm run build
```

This runs `wrangler pages functions build --outdir=./dist/_worker.js/` after the Astro build.

## Deployment

The compiled worker is deployed using:

```bash
npm run deploy        # Deploy to production
npm run deploy:dry-run # Test deployment configuration
```

## Adding New Endpoints

1. Create a new file in `functions/api/` (e.g., `functions/api/myendpoint.ts`)
2. Export an `onRequest` function (or specific HTTP method handlers)
3. Rebuild the project

The endpoint will be available at `/api/myendpoint`.

## Resources

- [Cloudflare Pages Functions Documentation](https://developers.cloudflare.com/pages/functions/)
- [Pages Functions API Reference](https://developers.cloudflare.com/pages/functions/api-reference/)

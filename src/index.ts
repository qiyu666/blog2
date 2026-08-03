// Worker entry: handles API routes from functions/ directory + static assets
// Cloudflare Workers automatically pick up functions/ directory for API routes.
// This file serves as the main entry for static asset serving and SPA fallback.

type Env = {
  DB: D1Database
  ADMIN_SECRET: string
  GITHUB_CLIENT_ID: string
  GITHUB_CLIENT_SECRET: string
}

const SPA_ROUTES = [
  '/post/',
  '/user/',
  '/users/',
  '/tag/',
  '/tags',
  '/archives',
  '/history',
  '/series',
  '/links',
  '/unsubscribe',
  '/login',
  '/register',
  '/forgot-password',
  '/settings',
  '/security',
  '/customize',
  '/mailbox',
  '/notifications',
  '/favorites',
  '/drafts',
  '/admin',
  '/promote',
  '/bug-report',
  '/oauth-setup',
  '/github-callback',
]

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const pathname = url.pathname

    // API routes are handled by the functions/ directory (Workers routing)
    // If the route doesn't match any function, it falls through here.

    // Check if this is a static asset request
    const assetExtensions = [
      '.html', '.js', '.css', '.json', '.svg', '.png', '.jpg', '.jpeg',
      '.gif', '.ico', '.webp', '.woff', '.woff2', '.ttf', '.eot',
      '.map', '.xml', '.txt',
    ]
    const isAsset = assetExtensions.some((ext) => pathname.endsWith(ext))

    // SPA fallback: for known app routes, serve index.html
    const isAppRoute = SPA_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(route)
    )

    if (!isAsset && (isAppRoute || pathname === '/')) {
      // Serve index.html for SPA
      try {
        const indexResponse = await fetch(new Request(url.origin + '/index.html'), {
          headers: request.headers,
        })
        return indexResponse
      } catch {
        return new Response('Not Found', { status: 404 })
      }
    }

    // For any other non-API request, let it fall through to asset handling
    // Workers will automatically serve assets from the assets/ directory
    return new Response('Not Found', { status: 404 })
  },
} satisfies ExportedHandler<Env>

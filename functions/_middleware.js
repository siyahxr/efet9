export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // 1. Static files and system paths should go through normally
  // This includes the root (/), dashboard, shop, etc.
  const systemPaths = [
    '/', 
    '/index.html', 
    '/dashboard', 
    '/dashboard.html', 
    '/shop', 
    '/shop.html', 
    '/checkout', 
    '/checkout.html',
    '/admin',
    '/admin.html',
    '/login',
    '/signup'
  ];

  if (path.startsWith('/assets/') || path.startsWith('/api/') || systemPaths.includes(path) || path.includes('.')) {
    return next();
  }

  // 2. If it's a "clean" path (like /username), rewrite internally to profile.html
  // This keeps the URL in the browser as /username but serves the profile.html content
  return env.ASSETS.fetch(new URL('/profile.html', request.url));
}

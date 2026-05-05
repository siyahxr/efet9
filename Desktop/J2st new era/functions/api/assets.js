// functions/api/assets.js
export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const key = url.searchParams.get('key');

    if (!key) return new Response('Missing key', { status: 400 });
    if (!env.ASSETS_R2) return new Response('R2 binding missing', { status: 500 });

    try {
        const object = await env.ASSETS_R2.get(key);

        if (!object) {
            return new Response('Object Not Found', { status: 404 });
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        headers.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

        return new Response(object.body, {
            headers
        });
    } catch (e) {
        return new Response(e.message, { status: 500 });
    }
}

// functions/upload-asset.js
export async function onRequest(context) {
    const { request, env } = context;

    const respond = (data, status = 200) => {
        return new Response(JSON.stringify(data), {
            status,
            headers: { 'Content-Type': 'application/json' }
        });
    };

    if (request.method !== 'POST') return respond({ success: false, error: 'Method not allowed' }, 405);
    if (!env.ASSETS_R2) return respond({ success: false, error: 'R2 storage not bound' }, 500);

    try {
        const formData = await request.formData();
        const file = formData.get('file');
        const key = formData.get('key');

        if (!file || !key) return respond({ success: false, error: 'Missing file/key' }, 400);

        const buffer = await file.arrayBuffer();
        await env.ASSETS_R2.put(key, buffer, {
            httpMetadata: { contentType: file.type }
        });

        return respond({ success: true, url: `/api/assets?key=${key}` });
    } catch (e) {
        return respond({ success: false, error: e.message }, 500);
    }
}

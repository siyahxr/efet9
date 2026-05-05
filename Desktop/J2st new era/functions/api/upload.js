// functions/api/upload.js
export async function onRequestPost(context) {
    const { request, env } = context;
    
    // JSON Header helper
    const jsonResponse = (data, status = 200) => new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });

    if (!env.ASSETS_R2) {
        return jsonResponse({ success: false, error: 'R2 binding (ASSETS_R2) is missing. Check your wrangler.toml or dashboard bindings.' }, 500);
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file');
        const key = formData.get('key');
        
        if (!file || !key) {
            return jsonResponse({ success: false, error: 'Missing file or key in request.' }, 400);
        }

        // Convert to ArrayBuffer for better compatibility
        const buffer = await file.arrayBuffer();

        // Upload to R2
        await env.ASSETS_R2.put(key, buffer, {
            httpMetadata: { contentType: file.type }
        });

        return jsonResponse({ 
            success: true, 
            url: `/api/assets?key=${key}` 
        });
    } catch (e) {
        console.error("R2 Upload Error:", e);
        return jsonResponse({ success: false, error: 'Server Catch: ' + e.message }, 500);
    }
}

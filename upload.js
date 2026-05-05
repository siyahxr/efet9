// functions/api/upload.js
export async function onRequestPost(context) {
    const { request, env } = context;
    
    if (!env.ASSETS_R2) {
        return new Response(JSON.stringify({ success: false, error: 'R2 binding missing' }), { status: 500 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file');
        const key = formData.get('key'); // e.g., "username_avatar"
        
        if (!file || !key) {
            return new Response(JSON.stringify({ success: false, error: 'Missing file or key' }), { status: 400 });
        }

        // Upload to R2
        await env.ASSETS_R2.put(key, file.stream(), {
            httpMetadata: { contentType: file.type }
        });

        return new Response(JSON.stringify({ 
            success: true, 
            url: `/api/assets?key=${key}` 
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
    }
}

// functions/api/upload-file.js
export async function onRequest(context) {
    const { request, env } = context;

    // Her durumda JSON dönmesini garanti eden yardımcı fonksiyon
    const respond = (data, status = 200) => {
        return new Response(JSON.stringify(data), {
            status,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    };

    // Sadece POST isteklerine izin ver
    if (request.method !== 'POST') {
        return respond({ success: false, error: 'Only POST allowed' }, 405);
    }

    if (!env.ASSETS_R2) {
        return respond({ success: false, error: 'Cloud Storage (R2) is not connected. Please check your wrangler.toml and Cloudflare dashboard.' }, 500);
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file');
        const key = formData.get('key');

        if (!file || !key) {
            return respond({ success: false, error: 'File or Key is missing in the request' }, 400);
        }

        // Dosyayı oku ve R2'ye yükle
        const arrayBuffer = await file.arrayBuffer();
        
        try {
            await env.ASSETS_R2.put(key, arrayBuffer, {
                httpMetadata: { contentType: file.type || 'application/octet-stream' }
            });
        } catch (r2Error) {
            return respond({ success: false, error: 'Cloud Storage Error: ' + r2Error.message }, 500);
        }

        return respond({ 
            success: true, 
            url: `/api/assets?key=${key}` 
        });

    } catch (err) {
        return respond({ success: false, error: 'Server Error: ' + err.message }, 500);
    }
}

// functions/api/admin/action.js
export async function onRequestPost(context) {
    const { request, env } = context;
    const { target_user, action, value } = await request.json();

    if (!env.DB) return new Response(JSON.stringify({ success: false, error: 'DB missing' }), { status: 500 });

    try {
        if (action === 'ban') {
            const bannedValue = value ? 1 : 0;
            await env.DB.prepare("UPDATE users SET banned = ? WHERE username = ?").bind(bannedValue, target_user).run();
        }
        // Flagging is not in D1 schema currently, but we could add it if needed.
        
        return new Response(JSON.stringify({ success: true }));
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
    }
}

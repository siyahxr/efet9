// functions/api/save.js
export async function onRequestPost(context) {
    const { request, env } = context;
    const payload = await request.json();
    const { username } = payload;

    if (!env.DB) return new Response(JSON.stringify({ success: false, error: 'Database binding (DB) is missing.' }), { status: 500 });

    try {
        const dataStr = JSON.stringify({ success: true, ...payload });
        
        // Upsert profile data
        const exists = await env.DB.prepare("SELECT username FROM profiles WHERE username = ?").bind(username).first();
        if (exists) {
            await env.DB.prepare("UPDATE profiles SET data = ? WHERE username = ?").bind(dataStr, username).run();
        } else {
            await env.DB.prepare("INSERT INTO profiles (username, data) VALUES (?, ?)").bind(username, dataStr).run();
        }

        return new Response(JSON.stringify({ success: true }));
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: 'Database error' }), { status: 500 });
    }
}

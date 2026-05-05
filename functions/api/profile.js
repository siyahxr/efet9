// functions/api/profile.js
export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const username = url.searchParams.get('u');

    if (!username) return new Response(JSON.stringify({ success: false, error: 'No username' }), { status: 400 });

    if (!env.DB) return new Response(JSON.stringify({ success: false, error: 'Database binding (DB) is missing.' }), { status: 500 });

    try {
        // 1. Check D1 (New users)
        const user = await env.DB.prepare("SELECT password, banned FROM users WHERE username = ?").bind(username).first();
        const profile = await env.DB.prepare("SELECT data FROM profiles WHERE username = ?").bind(username).first();
        if (profile) {
            return new Response(profile.data, { headers: { 'Content-Type': 'application/json' } });
        }

        // Fallback to static db.json (Old accounts)
        const staticDbResponse = await env.ASSETS.fetch(new URL('/db.json', request.url));
        if (staticDbResponse.ok) {
            const db = await staticDbResponse.json();
            if (db.profiles && db.profiles[username]) {
                return new Response(JSON.stringify({ success: true, ...db.profiles[username] }), { headers: { 'Content-Type': 'application/json' } });
            }
        }

        return new Response(JSON.stringify({ success: false, error: 'User not found' }), { status: 404 });
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: 'Database error. Make sure D1 is connected.' }), { status: 500 });
    }
}

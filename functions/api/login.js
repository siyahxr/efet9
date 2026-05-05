// functions/api/login.js
export async function onRequestPost(context) {
    const { request, env } = context;
    const { username, password } = await request.json();

    if (!env.DB) return new Response(JSON.stringify({ success: false, error: 'Database binding (DB) is missing.' }), { status: 500 });

    try {
        // 1. Check D1 (New users)
        const user = await env.DB.prepare("SELECT password, banned FROM users WHERE username = ?").bind(username).first();
        
        if (user) {
            if (user.banned) return new Response(JSON.stringify({ success: false, error: 'Banned' }), { status: 403 });
            if (user.password === password) {
                return new Response(JSON.stringify({ success: true, username }));
            }
        }

        // 2. Fallback to db.json (Old users)
        const staticDbResponse = await env.ASSETS.fetch(new URL('/db.json', request.url));
        if (staticDbResponse.ok) {
            const db = await staticDbResponse.json();
            if (db.users && db.users[username]) {
                if (db.users[username].banned) return new Response(JSON.stringify({ success: false, error: 'Banned' }), { status: 403 });
                if (db.users[username].password === password) {
                    return new Response(JSON.stringify({ success: true, username }));
                }
            }
        }

        return new Response(JSON.stringify({ success: false, error: 'Invalid credentials' }), { status: 401 });
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: 'Database error' }), { status: 500 });
    }
}

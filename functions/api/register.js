// functions/api/register.js
export async function onRequestPost(context) {
    const { request, env } = context;
    const { username, password } = await request.json();

    if (!env.DB) return new Response(JSON.stringify({ success: false, error: 'Database binding (DB) is missing.' }), { status: 500 });

    try {
        // Check if exists
        const exists = await env.DB.prepare("SELECT username FROM users WHERE username = ?").bind(username).first();
        if (exists) return new Response(JSON.stringify({ success: false, error: 'User exists' }), { status: 400 });

        // Insert new user
        await env.DB.prepare("INSERT INTO users (username, password) VALUES (?, ?)").bind(username, password).run();
        
        // Initialize empty profile
        const emptyProfile = JSON.stringify({ success: true, username, display_name: username, links: [], appearance: { displayName: username } });
        await env.DB.prepare("INSERT INTO profiles (username, data) VALUES (?, ?)").bind(username, emptyProfile).run();

        return new Response(JSON.stringify({ success: true }));
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: 'Database error' }), { status: 500 });
    }
}

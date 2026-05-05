// functions/api/admin/users.js
export async function onRequestGet(context) {
    const { env } = context;

    if (!env.DB) return new Response(JSON.stringify({ success: false, error: 'DB missing' }), { status: 500 });

    try {
        // Fetch all users from D1
        const { results: d1Users } = await env.DB.prepare("SELECT username, banned FROM users").all();
        
        // Format for the admin panel
        const users = d1Users.map(u => ({
            username: u.username,
            banned: u.banned === 1,
            method: 'D1 (Cloud)',
            registered_at: 'Cloud Storage'
        }));

        return new Response(JSON.stringify({ success: true, users }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
    }
}

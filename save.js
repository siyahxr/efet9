// functions/api/save.js
export async function onRequestPost(context) {
    const { request, env } = context;
    const payload = await request.json();
    const { username } = payload;

    if (!env.DB) return new Response(JSON.stringify({ success: false, error: 'Database binding (DB) is missing.' }), { status: 500 });

    try {
        // --- HANDLE SPECIAL ACTIONS ---
        if (payload.action === 'update_username') {
            const { new_username } = payload;
            
            // 1. Check if username taken
            const taken = await env.DB.prepare("SELECT username FROM users WHERE username = ?").bind(new_username).first();
            if (taken) return new Response(JSON.stringify({ success: false, error: 'Username already taken' }), { status: 400 });

            // 2. Check 7-day limit
            const user = await env.DB.prepare("SELECT last_username_change FROM users WHERE username = ?").bind(username).first();
            if (user.last_username_change) {
                const lastChange = new Date(user.last_username_change).getTime();
                const sevenDays = 7 * 24 * 60 * 60 * 1000;
                if (Date.now() - lastChange < sevenDays) {
                    const daysLeft = Math.ceil((sevenDays - (Date.now() - lastChange)) / (24 * 60 * 60 * 1000));
                    return new Response(JSON.stringify({ success: false, error: `You can change username in ${daysLeft} days` }), { status: 400 });
                }
            }

            // 3. Perform the migration (This is tricky in serverless, but we'll update the main records)
            const now = new Date().toISOString();
            await env.DB.batch([
                env.DB.prepare("UPDATE users SET username = ?, last_username_change = ? WHERE username = ?").bind(new_username, now, username),
                env.DB.prepare("UPDATE profiles SET username = ? WHERE username = ?").bind(new_username, username)
            ]);

            return new Response(JSON.stringify({ success: true }));
        }

        if (payload.action === 'update_password') {
            const { current_password, new_password } = payload;
            const user = await env.DB.prepare("SELECT password FROM users WHERE username = ?").bind(username).first();
            if (user.password !== current_password) return new Response(JSON.stringify({ success: false, error: 'Current password incorrect' }), { status: 400 });

            await env.DB.prepare("UPDATE users SET password = ? WHERE username = ?").bind(new_password, username).run();
            return new Response(JSON.stringify({ success: true }));
        }

        // --- NORMAL PROFILE SAVE ---
        const dataStr = JSON.stringify({ success: true, ...payload });
        await env.DB.prepare("INSERT INTO profiles (username, data) VALUES (?, ?) ON CONFLICT(username) DO UPDATE SET data = excluded.data").bind(username, dataStr).run();
        
        return new Response(JSON.stringify({ success: true }));
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
    }
}

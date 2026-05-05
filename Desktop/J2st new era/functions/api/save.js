// functions/api/save.js
export async function onRequestPost(context) {
    const { request, env } = context;

    if (!env.DB) return new Response(JSON.stringify({ success: false, error: 'Database binding (DB) is missing.' }), { status: 500 });

    try {
        const payload = await request.json();
        const { username, action } = payload;

        if (!username) return new Response(JSON.stringify({ success: false, error: 'No username' }), { status: 400 });

        // --- HANDLE SPECIAL ACTIONS ---
        if (action === 'update_username') {
            const { new_username } = payload;
            const taken = await env.DB.prepare("SELECT username FROM users WHERE username = ?").bind(new_username).first();
            if (taken) return new Response(JSON.stringify({ success: false, error: 'Username already taken' }), { status: 400 });

            const user = await env.DB.prepare("SELECT last_username_change FROM users WHERE username = ?").bind(username).first();
            if (user && user.last_username_change) {
                const lastChange = new Date(user.last_username_change).getTime();
                const sevenDays = 7 * 24 * 60 * 60 * 1000;
                if (Date.now() - lastChange < sevenDays) {
                    const daysLeft = Math.ceil((sevenDays - (Date.now() - lastChange)) / (24 * 60 * 60 * 1000));
                    return new Response(JSON.stringify({ success: false, error: `You can change username in ${daysLeft} days` }), { status: 400 });
                }
            }

            const now = new Date().toISOString();
            await env.DB.batch([
                env.DB.prepare("UPDATE users SET username = ?, last_username_change = ? WHERE username = ?").bind(new_username, now, username),
                env.DB.prepare("UPDATE profiles SET username = ? WHERE username = ?").bind(new_username, username)
            ]);
            return new Response(JSON.stringify({ success: true }));
        }

        if (action === 'change_password') {
            const { new_password } = payload;
            await env.DB.prepare("UPDATE users SET password = ? WHERE username = ?").bind(new_password, username).run();
            return new Response(JSON.stringify({ success: true, message: 'Password updated successfully' }));
        }

        // --- NORMAL PROFILE SAVE ---
        // We exclude action/username from the data string but keep them in the payload for processing
        const { action: _a, username: _u, ...profileData } = payload;
        const dataStr = JSON.stringify(profileData);
        
        await env.DB.prepare("INSERT OR REPLACE INTO profiles (username, data) VALUES (?, ?)")
            .bind(username, dataStr)
            .run();

        return new Response(JSON.stringify({ success: true }));
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
    }
}

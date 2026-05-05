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
            const ip = request.headers.get('CF-Connecting-IP') || 'anonymous';
            const now = Date.now();
            const oneDay = 24 * 60 * 60 * 1000;

            // Check if this IP visited this profile in the last 24h
            const lastView = await env.DB.prepare("SELECT timestamp FROM view_logs WHERE username = ? AND ip = ?").bind(username, ip).first();
            
            if (!lastView || (now - lastView.timestamp) > oneDay) {
                // New visitor or 24h passed: Increment and log
                context.waitUntil(Promise.all([
                    env.DB.prepare("UPDATE profiles SET views = views + 1 WHERE username = ?").bind(username).run(),
                    env.DB.prepare("INSERT OR REPLACE INTO view_logs (username, ip, timestamp) VALUES (?, ?, ?)").bind(username, ip, now).run()
                ]));
            }
            
            const profileData = JSON.parse(profile.data);
            const views = (await env.DB.prepare("SELECT views FROM profiles WHERE username = ?").bind(username).first())?.views || 0;
            
            return new Response(JSON.stringify({ success: true, ...profileData, views }), { headers: { 'Content-Type': 'application/json' } });
        }

        // Fallback to static db.json (Old accounts)
        const staticDbResponse = await env.ASSETS.fetch(new URL('/db.json', request.url));
        if (staticDbResponse.ok) {
            const db = await staticDbResponse.json();
            if (db.profiles && db.profiles[username]) {
                const oldProfile = db.profiles[username];
                
                // IMPORTANT: Automatically migrate this profile to D1 so it's permanent
                const dataStr = JSON.stringify({ success: true, ...oldProfile });
                context.waitUntil(env.DB.prepare("INSERT OR IGNORE INTO profiles (username, data, views) VALUES (?, ?, ?)").bind(username, dataStr, 0).run());
                
                return new Response(JSON.stringify({ success: true, ...oldProfile, views: 0 }), { headers: { 'Content-Type': 'application/json' } });
            }
        }

        return new Response(JSON.stringify({ success: false, error: 'Profile not found' }), { status: 404 });
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: 'Server Error: ' + e.message }), { status: 500 });
    }
}

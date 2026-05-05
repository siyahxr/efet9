/* J2ST LANDING SCRIPT - ORIGINAL VERSION */
document.addEventListener('DOMContentLoaded', () => {
    const authModal = document.getElementById('auth-modal');
    const loginTrigger = document.getElementById('login-trigger');
    const signupTrigger = document.getElementById('signup-trigger');
    const closeModal = document.querySelector('.close-modal');
    const authTabs = document.querySelectorAll('.auth-tab');
    const authViews = document.querySelectorAll('.auth-view');

    // Auto-open modal based on path (Yönlendirmeyi kaldırdık, sadece modalları açıyoruz)
    if (window.location.pathname === '/login') setTimeout(() => openAuth('login'), 100);
    if (window.location.pathname === '/signup') setTimeout(() => openAuth('signup'), 100);

    const openAuth = (tab) => {
        authModal.classList.add('active');
        switchTab(tab);
    };

    const switchTab = (tab) => {
        authTabs.forEach(t => t.classList.remove('active'));
        authViews.forEach(v => v.classList.remove('active'));
        document.querySelector(`.auth-tab[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`${tab}-view`).classList.add('active');
    };

    if (loginTrigger) loginTrigger.onclick = () => openAuth('login');
    if (signupTrigger) signupTrigger.onclick = () => openAuth('signup');
    if (closeModal) closeModal.onclick = () => authModal.classList.remove('active');

    authTabs.forEach(tab => {
        tab.onclick = () => switchTab(tab.dataset.tab);
    });

    // --- Notification System ---
    const createToastContainer = () => {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    };

    window.showToast = (message, type = 'info') => {
        const container = createToastContainer();
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
            <span class="toast-message">${message}</span>
        `;
        container.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => toast.classList.add('active'), 10);
        
        // Remove after 4 seconds
        setTimeout(() => {
            toast.classList.remove('active');
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    };

    // --- Server Health Check ---
    const checkServer = async () => {
        try {
            const res = await fetch('/api/health');
            const data = await res.json();
            console.log("Server Health:", data);
        } catch (err) {
            console.warn("Server not responding or outdated. Please RESTART server.py");
        }
    };
    checkServer();

    // Real Auth Logic
    const loginBtn = document.getElementById('login-submit-btn');
    const signupBtn = document.getElementById('signup-submit-btn');

    if (loginBtn) {
        loginBtn.onclick = async (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value.trim();

            console.log("Login Attempt:", username);

            if (!username || !password) return showToast('Please fill all fields', 'error');

            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await res.json();
                if (data.success) {
                    localStorage.setItem('j2st_currentUser', username);
                    window.location.href = '/dashboard';
                } else {
                    showToast(data.error || 'Login failed', 'error');
                }
            } catch (err) { 
                console.error("Login Error:", err);
                showToast('Server error during login', 'error'); 
            }
        };
    }

    if (signupBtn) {
        signupBtn.onclick = async (e) => {
            e.preventDefault();
            const username = document.getElementById('modal-username-input').value.trim();
            const password = document.getElementById('modal-password-input').value.trim();

            console.log("Signup attempt:", username, username.length);

            if (username.length < 3 || username.length > 12) {
                showToast('Username must be 3-12 characters!', 'error');
                return;
            }
            if (!password) {
                showToast('Please enter a password', 'error');
                return;
            }

            try {
                const res = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await res.json();
                if (data.success) {
                    showToast('Account created successfully!', 'success');
                    localStorage.setItem('j2st_currentUser', username);
                    setTimeout(() => window.location.href = '/dashboard', 1000);
                } else {
                    showToast(data.error || 'Signup failed', 'error');
                }
            } catch (err) { 
                console.error("Signup Error:", err);
                showToast('Server error during signup', 'error'); 
            }
        };
    }

    // --- Google Identity Logic ---
    window.handleGoogleResponse = (response) => {
        try {
            // Safer JWT Decoding
            const base64Url = response.credential.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            const payload = JSON.parse(jsonPayload);
            
            console.log('Google User:', payload);
            const username = payload.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
            localStorage.setItem('j2st_currentUser', username);
            
            const modalBox = document.querySelector('.modal-box');
            if (modalBox) {
                modalBox.innerHTML = `
                    <div style="padding:40px; text-align:center;">
                        <div class="success-icon" style="font-size:40px; margin-bottom:15px;">✅</div>
                        <h2 style="margin-bottom:10px;">Welcome, ${payload.given_name || payload.name}!</h2>
                        <p style="opacity:0.6;">Redirecting to dashboard...</p>
                    </div>
                `;
            }
            setTimeout(() => window.location.href = '/dashboard', 1200);
        } catch (err) {
            console.error('Google Auth Error:', err);
        }
    };

    function initGoogle() {
        if (typeof google !== 'undefined' && google.accounts) {
            google.accounts.id.initialize({
                client_id: "88039540835-0cjbl0al9chadov9qidjd2c3l9v70ar3.apps.googleusercontent.com",
                callback: handleGoogleResponse
            });

            const btnOptions = { 
                theme: "filled_black", 
                size: "large", 
                width: "320", 
                text: "continue_with", 
                shape: "pill",
                logo_alignment: "center" 
            };
            
            const loginContainer = document.getElementById('google-login-btn');
            const signupContainer = document.getElementById('google-signup-btn');
            
            if (loginContainer) google.accounts.id.renderButton(loginContainer, btnOptions);
            if (signupContainer) google.accounts.id.renderButton(signupContainer, btnOptions);
            
            google.accounts.id.prompt(); // One Tap
        } else {
            setTimeout(initGoogle, 100); 
        }
    }

    initGoogle();

    // --- Background Particles ---
    const canvas = document.getElementById('bg-particles');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let pts = [];
        const resize = () => { 
            canvas.width = window.innerWidth; 
            canvas.height = window.innerHeight; 
        };
        window.addEventListener('resize', resize); 
        resize();
        
        for(let i=0; i<60; i++) {
            pts.push({ 
                x: Math.random() * canvas.width, 
                y: Math.random() * canvas.height, 
                vx: (Math.random() - 0.5) * 0.4, 
                vy: (Math.random() - 0.5) * 0.4, 
                s: Math.random() * 2, 
                a: Math.random() * 0.5 + 0.1 
            });
        }
        
        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            pts.forEach(p => {
                p.x += p.vx; 
                p.y += p.vy;
                if(p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) { 
                    p.x = Math.random() * canvas.width; 
                    p.y = Math.random() * canvas.height; 
                }
                ctx.beginPath(); 
                ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); 
                ctx.fillStyle = `rgba(255,255,255,${p.a})`; 
                ctx.fill();
            });
            requestAnimationFrame(animate);
        }
        animate();
    }
});

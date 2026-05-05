// Simple IndexedDB wrapper for large assets
const dbName = "J2ST_DB";
const storeName = "assets";

// Toast Notification System
window.showToast = (message, type = 'info') => {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
        <span class="toast-message">${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('active'), 10);
    setTimeout(() => {
        toast.classList.remove('active');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
};

function initDB() {
    return new Promise((resolve, reject) => {
        try {
            const request = indexedDB.open(dbName, 2);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName);
                }
            };
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e.target.error);
        } catch (e) {
            reject(e);
        }
    });
}

async function saveAsset(key, data) {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, "readwrite");
            const store = tx.objectStore(storeName);
            const request = store.put(data, key);
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => {
                console.error("Transaction error:", e.target.error);
                reject(e.target.error);
            };
            request.onerror = (e) => {
                console.error("Request error:", e.target.error);
                reject(e.target.error);
            };
        });
    } catch (e) {
        console.error("Failed to save asset:", e);
        throw e;
    }
}

async function getAsset(key) {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, "readonly");
            const store = tx.objectStore(storeName);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        });
    } catch (e) {
        console.error("Failed to get asset:", e);
        return null;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const currentUser = localStorage.getItem('j2st_currentUser');
    const isDashboard = window.location.pathname.includes('dashboard');
    
    if (!currentUser && isDashboard) {
        window.location.href = '/';
        return;
    }

    if (!currentUser) return;

    // --- Core Elements ---
    const displayUsername = document.getElementById('display-username');
    const previewName = document.getElementById('preview-name');
    const userAvatar = document.getElementById('user-avatar');
    const viewLiveBtn = document.getElementById('view-live-btn');
    const linksContainer = document.getElementById('links-container');
    const previewLinksContainer = document.getElementById('preview-links-container');
    const addLinkBtn = document.getElementById('add-link-btn');
    const template = document.getElementById('link-editor-template');
    const addLinkModal = document.getElementById('add-link-modal');
    const closeAddLink = document.getElementById('close-add-link');
    const socialSelectBtns = document.querySelectorAll('.social-select-btn');
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.dashboard-section');
    const logoutBtn = document.getElementById('logout-btn');
    const copyBtn = document.getElementById('copy-link-btn');
    const viewLiveBtns = document.querySelectorAll('.view-live-btn');
    const saveButtons = document.querySelectorAll('.save-btn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('j2st_currentUser');
            window.location.href = '/';
        });
    }

    // UI Setup
    if (displayUsername) displayUsername.textContent = '@' + currentUser;
    if (previewName) previewName.textContent = '@' + currentUser;
    if (userAvatar) userAvatar.textContent = currentUser.substring(0, 2).toUpperCase();
    
    viewLiveBtns.forEach(btn => {
        btn.href = `/${currentUser}`;
        btn.setAttribute('target', '_blank');
    });

    // --- Data Load ---
    let userLinks = [];
    try {
        const response = await fetch(`/api/profile?u=${currentUser}`);
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.links && data.links.length > 0) {
                userLinks = data.links;
                localStorage.setItem(`j2st_links_${currentUser}`, JSON.stringify(userLinks));
            } else {
                userLinks = JSON.parse(localStorage.getItem(`j2st_links_${currentUser}`)) || [];
            }
        } else {
            userLinks = JSON.parse(localStorage.getItem(`j2st_links_${currentUser}`)) || [];
        }
    } catch (e) { 
        console.error("Fetch error:", e); 
        userLinks = JSON.parse(localStorage.getItem(`j2st_links_${currentUser}`)) || [];
    }

    const SOCIAL_ICONS = {
        instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>',
        twitter: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
        discord: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 9a5 5 0 0 0-5-5H9a5 5 0 0 0-5 5v5a5 5 0 0 0 5 5h4a5 5 0 0 0 5-5V9z"></path><circle cx="9" cy="12" r="1"></circle><circle cx="15" cy="12" r="1"></circle></svg>',
        youtube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.16 1 12 1 12s0 3.84-.46 5.58a2.78 2.78 0 0 0 1.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94 2C23 15.84 23 12 23 12s0-3.84-.46-5.58z"></path><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"></polygon></svg>',
        tiktok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path><path d="M15 8a5 5 0 0 1 5 5"></path></svg>',
        spotify: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M8 14.5c2.5-1 5.5-1 8 0"></path><path d="M7 12c3.5-1.5 6.5-1.5 10 0"></path><path d="M6 9.5c4-2 8-2 12 0"></path></svg>',
        github: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>',
        custom: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>'
    };

    const PLATFORM_BASES = {
        instagram: 'https://instagram.com/',
        twitter: 'https://x.com/',
        tiktok: 'https://tiktok.com/@',
        youtube: 'https://youtube.com/@',
        spotify: 'https://open.spotify.com/user/',
        github: 'https://github.com/',
        discord: 'https://discord.com/users/'
    };

    // --- Tab Navigation ---
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.dataset.target;
            navItems.forEach(n => n.classList.remove('active'));
            sections.forEach(s => { s.style.display = 'none'; s.classList.remove('active'); });
            
            item.classList.add('active');
            const targetSection = document.getElementById(`section-${target}`);
            if (targetSection) {
                targetSection.style.display = 'block';
                targetSection.classList.add('active');
            }
        });
    });

    // --- Links Logic ---
    function renderLinks() {
        if (!linksContainer || !previewLinksContainer) return;
        linksContainer.innerHTML = '';
        previewLinksContainer.innerHTML = '';

        if (userLinks.length === 0) {
            linksContainer.innerHTML = '<p style="text-align:center; opacity:0.5; padding:20px;">No links added yet.</p>';
            return;
        }

        userLinks.forEach((link, index) => {
            const clone = template.content.cloneNode(true);
            const titleInput = clone.querySelector('.link-title-input');
            const urlInput = clone.querySelector('.link-url-input');
            const deleteBtn = clone.querySelector('.btn-delete-link');
            const iconDiv = clone.querySelector('.platform-icon');

            iconDiv.innerHTML = SOCIAL_ICONS[link.platform] || SOCIAL_ICONS.custom;
            titleInput.value = link.title;
            
            // If it's a known platform, only show the "handle" part in the input
            const base = PLATFORM_BASES[link.platform];
            if (base && link.url.startsWith(base)) {
                urlInput.value = link.url.replace(base, '');
                urlInput.placeholder = 'Your Username';
            } else {
                urlInput.value = link.url;
            }

            titleInput.addEventListener('input', (e) => {
                userLinks[index].title = e.target.value;
                localStorage.setItem(`j2st_links_${currentUser}`, JSON.stringify(userLinks));
                updatePreview();
            });

            urlInput.addEventListener('input', (e) => {
                const val = e.target.value.trim();
                const base = PLATFORM_BASES[link.platform];
                
                if (base) {
                    // Only update if they typed something; if they cleared it, make it empty
                    userLinks[index].url = val ? (base + val.replace('@', '')) : '';
                } else {
                    userLinks[index].url = val;
                }
                
                localStorage.setItem(`j2st_links_${currentUser}`, JSON.stringify(userLinks));
                updatePreview();
            });

            deleteBtn.addEventListener('click', () => {
                userLinks.splice(index, 1);
                localStorage.setItem(`j2st_links_${currentUser}`, JSON.stringify(userLinks));
                renderLinks();
            });

            linksContainer.appendChild(clone);
        });
        updatePreview();
    }

    function updatePreview() {
        if (!previewLinksContainer) return;
        previewLinksContainer.innerHTML = '';
        userLinks.forEach(link => {
            if (link.url.trim() !== '') {
                const btn = document.createElement('a');
                btn.className = 'preview-link-btn';
                btn.href = link.url;
                btn.target = '_blank';
                btn.innerHTML = SOCIAL_ICONS[link.platform] || SOCIAL_ICONS.custom;
                previewLinksContainer.appendChild(btn);
            }
        });
    }

    if (addLinkBtn) {
        addLinkBtn.addEventListener('click', () => addLinkModal.classList.add('active'));
    }
    if (closeAddLink) {
        closeAddLink.addEventListener('click', () => addLinkModal.classList.remove('active'));
    }

    socialSelectBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const platform = btn.dataset.platform;
            userLinks.push({
                id: Date.now().toString(),
                platform: platform,
                title: platform.charAt(0).toUpperCase() + platform.slice(1),
                url: ''
            });
            localStorage.setItem(`j2st_links_${currentUser}`, JSON.stringify(userLinks));
            renderLinks();
            addLinkModal.classList.remove('active');
        });
    });

    renderLinks();

    // --- Appearance Logic ---
    let appearanceData = {
        displayName: '@' + currentUser, bio: 'Welcome!', theme: 'dark', avatarEffect: 'none', location: '', discordId: '', badges: [], musicTitle: 'Background Music', extraEffects: [], font: 'Inter'
    };
    try {
        const response = await fetch(`/api/profile?u=${currentUser}`);
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.appearance && Object.keys(data.appearance).length > 0) {
                appearanceData = { ...appearanceData, ...data.appearance };
                localStorage.setItem(`j2st_appearance_${currentUser}`, JSON.stringify(appearanceData));
            } else {
                const saved = JSON.parse(localStorage.getItem(`j2st_appearance_${currentUser}`));
                if (saved) appearanceData = { ...appearanceData, ...saved };
            }
        } else {
            const saved = JSON.parse(localStorage.getItem(`j2st_appearance_${currentUser}`));
            if (saved) appearanceData = { ...appearanceData, ...saved };
        }
    } catch (e) { 
        console.error("Fetch error:", e);
        const saved = JSON.parse(localStorage.getItem(`j2st_appearance_${currentUser}`));
        if (saved) appearanceData = { ...appearanceData, ...saved };
    }

    const inputs = {
        displayName: document.getElementById('input-display-name'),
        bio: document.getElementById('input-bio'),
        location: document.getElementById('input-location'),
        discordId: document.getElementById('input-discord-id'),
        musicTitle: document.getElementById('input-music-title'),
        font: document.getElementById('input-font')
    };

    if (inputs.displayName) {
        inputs.displayName.value = appearanceData.displayName.replace('@', '');
        inputs.displayName.addEventListener('input', (e) => {
            appearanceData.displayName = '@' + e.target.value;
            if (previewName) previewName.textContent = appearanceData.displayName;
            saveAppearanceToLocal();
        });
    }
    if (inputs.bio) {
        inputs.bio.value = appearanceData.bio;
        inputs.bio.addEventListener('input', (e) => {
            appearanceData.bio = e.target.value;
            const previewBio = document.getElementById('preview-bio');
            if (previewBio) previewBio.textContent = appearanceData.bio;
            saveAppearanceToLocal();
        });
    }
    if (inputs.location) {
        inputs.location.value = appearanceData.location;
        inputs.location.addEventListener('input', (e) => {
            appearanceData.location = e.target.value;
            saveAppearanceToLocal();
        });
    }
    if (inputs.discordId) {
        inputs.discordId.value = appearanceData.discordId;
        inputs.discordId.addEventListener('input', (e) => {
            appearanceData.discordId = e.target.value;
            saveAppearanceToLocal();
        });
    }
    if (inputs.musicTitle) {
        inputs.musicTitle.value = appearanceData.musicTitle;
        inputs.musicTitle.addEventListener('input', (e) => {
            appearanceData.musicTitle = e.target.value;
            saveAppearanceToLocal();
        });
    }
    if (inputs.font) {
        inputs.font.value = appearanceData.font;
        inputs.font.addEventListener('change', (e) => {
            appearanceData.font = e.target.value;
            saveAppearanceToLocal();
        });
    }

    function saveAppearanceToLocal() {
        const activeEffectBtn = document.querySelector('.effect-btn.active');
        const activeEffect = activeEffectBtn ? activeEffectBtn.dataset.effect : 'none';
        const selectedExtras = Array.from(document.querySelectorAll('.extra-opt.active')).map(b => b.dataset.extra);
        
        appearanceData = {
            ...appearanceData,
            displayName: inputs.displayName ? '@' + inputs.displayName.value : appearanceData.displayName,
            bio: inputs.bio ? inputs.bio.value : appearanceData.bio,
            location: inputs.location ? inputs.location.value : appearanceData.location,
            discordId: inputs.discordId ? inputs.discordId.value : appearanceData.discordId,
            avatarEffect: activeEffect,
            extraEffects: selectedExtras,
            musicTitle: inputs.musicTitle?.value || appearanceData.musicTitle,
            font: inputs.font?.value || appearanceData.font
        };

        localStorage.setItem(`j2st_appearance_${currentUser}`, JSON.stringify(appearanceData));
    }

    // --- File Handling ---
    function handleFile(inputId, nameId, key, callback) {
        const input = document.getElementById(inputId);
        const name = document.getElementById(nameId);
        if (!input) return;
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const limit = (key === 'music') ? 100 * 1024 * 1024 : 50 * 1024 * 1024;
                if (file.size > limit) { 
                    showToast(`File too large! Max ${key === 'music' ? '100MB' : '50MB'} allowed.`, 'error'); 
                    return; 
                }
                if (name) name.textContent = file.name;
                const reader = new FileReader();
                reader.onload = async (ev) => {
                    const status = document.createElement('div');
                    status.style.cssText = 'position:fixed;bottom:20px;right:20px;background:rgba(255,255,255,0.1);padding:10px 20px;border-radius:8px;backdrop-filter:blur(10px);z-index:1000;font-size:12px;';
                    status.textContent = 'Uploading...';
                    document.body.appendChild(status);
                    try {
                        if (!currentUser) throw new Error("No user logged in");
                        await saveAsset(`${currentUser}_${key}`, ev.target.result);
                        if (callback) callback(ev.target.result);
                        status.textContent = 'Upload Successful!';
                        status.style.background = 'rgba(74, 222, 128, 0.2)';
                        setTimeout(() => status.remove(), 2000);
                    } catch (err) {
                        console.error("Upload error details:", err);
                        status.textContent = 'Upload Failed: ' + (err.message || 'Storage error');
                        status.style.background = 'rgba(255,0,0,0.2)';
                        setTimeout(() => status.remove(), 5000);
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    handleFile('input-avatar-file', 'avatar-file-name', 'avatar', (data) => {
        const preview = document.querySelector('.preview-avatar');
        if (preview) {
            preview.style.backgroundImage = data.startsWith('data:video/') ? 'none' : `url(${data})`;
            preview.style.backgroundSize = 'cover';
        }
    });
    handleFile('input-background-file', 'background-file-name', 'background');
    handleFile('input-music-file', 'music-file-name', 'music');
    handleFile('input-cursor-file', 'cursor-file-name', 'cursor');

    // Effect Buttons
    const effectBtns = document.querySelectorAll('.effect-btn');
    const previewWrapper = document.getElementById('preview-avatar-wrapper');

    function updateEffectPreview(effect) {
        if (!previewWrapper) return;
        previewWrapper.className = 'avatar-wrapper ' + (effect || '');
    }

    effectBtns.forEach(btn => {
        if (btn.dataset.effect === appearanceData.avatarEffect) {
            btn.classList.add('active');
            btn.style.border = '2px solid var(--accent)';
            updateEffectPreview(appearanceData.avatarEffect);
        } else {
            btn.classList.remove('active');
            btn.style.border = '1px solid rgba(255,255,255,0.1)';
        }
        btn.addEventListener('click', () => {
            effectBtns.forEach(b => {
                b.classList.remove('active');
                b.style.border = '1px solid rgba(255,255,255,0.1)';
            });
            btn.classList.add('active');
            btn.style.border = '2px solid var(--accent)';
            updateEffectPreview(btn.dataset.effect);
            saveAppearanceToLocal();
        });
    });

    const extraBtns = document.querySelectorAll('.extra-opt');
    extraBtns.forEach(btn => {
        if (appearanceData.extraEffects.includes(btn.dataset.extra)) {
            btn.classList.add('active');
            btn.style.borderColor = 'var(--accent)';
            btn.style.background = 'rgba(255,255,255,0.08)';
        }
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
            if (btn.classList.contains('active')) {
                btn.style.borderColor = 'var(--accent)';
                btn.style.background = 'rgba(255,255,255,0.08)';
            } else {
                btn.style.borderColor = 'rgba(255,255,255,0.1)';
                btn.style.background = 'rgba(255,255,255,0.03)';
            }
            saveAppearanceToLocal();
        });
    });

    // --- Analytics ---
    let analytics = { views: 0, clicks: 0 };
    try {
        const saved = JSON.parse(localStorage.getItem(`j2st_analytics_${currentUser}`));
        if (saved) analytics = saved;
    } catch (e) { console.error(e); }

    const vEl = document.getElementById('analytics-views');
    const cEl = document.getElementById('analytics-clicks');
    const ctrEl = document.getElementById('analytics-ctr');
    if (vEl) vEl.textContent = analytics.views.toLocaleString();
    if (cEl) cEl.textContent = analytics.clicks.toLocaleString();
    if (ctrEl) ctrEl.textContent = (analytics.views > 0 ? ((analytics.clicks / analytics.views) * 100).toFixed(1) : 0) + '%';

    // --- Logout ---
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            localStorage.removeItem('j2st_currentUser');
            window.location.href = '/';
        };
    }

    // --- Save to Cloud ---
    async function performGlobalSave(btn) {
        const oldText = btn.innerText;
        btn.innerText = 'Saving...';
        btn.disabled = true;

        saveAppearanceToLocal(); // Final sync

        // Ensure the avatarEffect is correctly captured from the active button
        const activeBtn = document.querySelector('.effect-btn.active');
        const effectName = activeBtn ? activeBtn.dataset.effect : 'none';
        appearanceData.avatarEffect = effectName;

        const payload = {
            username: currentUser,
            display_name: appearanceData.displayName,
            bio: appearanceData.bio,
            location: appearanceData.location,
            discord_id: appearanceData.discordId,
            appearance: {
                ...appearanceData,
                avatarEffect: effectName
            },
            links: userLinks,
            music_title: appearanceData.musicTitle
        };

        console.log("[DEBUG] Saving payload:", payload);

        try {
            const response = await fetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                saveButtons.forEach(b => {
                    b.innerText = 'Saved Successfully!';
                    b.style.background = '#4ade80';
                });
                showToast('Profile saved successfully!', 'success');
            } else {
                const data = await response.json();
                throw new Error(data.error || 'Save failed');
            }
        } catch (err) {
            console.error("[DEBUG] Save error:", err);
            btn.innerText = 'Save Failed!';
            btn.style.background = '#f87171';
            showToast(err.message || 'Failed to connect to server', 'error');
        }

        setTimeout(() => {
            saveButtons.forEach(b => {
                b.innerText = oldText;
                b.style.background = '';
                b.disabled = false;
            });
        }, 2000);
    }

    saveButtons.forEach(btn => {
        btn.addEventListener('click', () => performGlobalSave(btn));
    });

    // --- Copy Link ---
    if (copyBtn) copyBtn.onclick = () => {
        navigator.clipboard.writeText(`${window.location.origin}/${currentUser}`);
        const old = copyBtn.innerHTML;
        copyBtn.innerText = 'Copied!';
        setTimeout(() => copyBtn.innerHTML = old, 2000);
    };

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
        setTimeout(() => toast.classList.add('active'), 10);
        setTimeout(() => {
            toast.classList.remove('active');
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    };

    // --- Change Password Logic ---
    const changePasswordBtn = document.getElementById('change-password-btn');
    if (changePasswordBtn) {
        changePasswordBtn.onclick = async () => {
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;

            if (!currentPassword || !newPassword) return showToast('Please fill all fields', 'error');
            if (newPassword.length < 6) return showToast('New password must be at least 6 characters', 'error');

            const oldText = changePasswordBtn.innerText;
            changePasswordBtn.innerText = 'Updating...';
            changePasswordBtn.disabled = true;

            try {
                const response = await fetch('/api/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        username: currentUser, 
                        current_password: currentPassword, 
                        new_password: newPassword 
                    })
                });

                const data = await response.json();
                if (data.success) {
                    showToast('Password updated successfully!', 'success');
                    document.getElementById('current-password').value = '';
                    document.getElementById('new-password').value = '';
                } else {
                    showToast(data.error || 'Failed to update password', 'error');
                }
            } catch (err) { showToast('Server error', 'error'); }

            changePasswordBtn.innerText = oldText;
            changePasswordBtn.disabled = false;
        };
    }

    // --- Async Asset Loading (Non-blocking) ---
    try {
        const avatarData = await getAsset(`${currentUser}_avatar`);
        if (avatarData) {
            const preview = document.querySelector('.preview-avatar');
            if (preview) {
                preview.style.backgroundImage = avatarData.startsWith('data:video/') ? 'none' : `url(${avatarData})`;
                preview.style.backgroundSize = 'cover';
            }
        }
    } catch (e) { console.error("Asset load error:", e); }
});

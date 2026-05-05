// dashboard.js
document.addEventListener('DOMContentLoaded', async () => {
    const currentUser = localStorage.getItem('j2st_currentUser');
    if (!currentUser) { window.location.href = '/login'; return; }

    // --- Appearance Data Initialization ---
    let appearanceData = {
        displayName: '@' + currentUser, bio: 'Welcome!', theme: 'dark', avatarEffect: 'none', location: '', discordId: '', badges: [], musicTitle: 'Background Music', extraEffects: [], font: 'Inter'
    };

    // --- Data Load ---
    let userLinks = [];
    try {
        const response = await fetch(`/api/profile?u=${currentUser}`);
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                userLinks = data.links || [];
                appearanceData = { ...appearanceData, ...(data.appearance || {}) };
                // Update Analytics UI
                const totalViewsEl = document.getElementById('total-views');
                if (totalViewsEl && data.views !== undefined) totalViewsEl.textContent = data.views.toLocaleString();
            }
        }
    } catch (e) { console.error("Load error:", e); }

    // --- Helper: Compress Image ---
    async function compressImage(base64, maxWidth, maxHeight, quality = 0.7) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
                } else {
                    if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = base64;
        });
    }

    // --- UI Update Functions ---
    function showToast(msg, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
    }

    // --- File Handling (Pure D1/Base64 Version) ---
    function handleFile(inputId, nameId, key, callback) {
        const input = document.getElementById(inputId);
        const nameDisplay = document.getElementById(nameId);
        if (!input) return;
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (nameDisplay) nameDisplay.textContent = file.name;

            const reader = new FileReader();
            reader.onload = async (ev) => {
                let data = ev.target.result;
                
                // If it's an image, compress it to fit in D1
                if (file.type.startsWith('image/')) {
                    const limit = (key === 'avatar') ? 400 : 1280;
                    data = await compressImage(data, limit, limit, 0.7);
                } else if (file.type.startsWith('video/')) {
                    // Videos can't be easily compressed in JS, we'll store them as is if small
                    if (file.size > 800 * 1024) { // 800KB limit for videos in D1
                        showToast("Video too large for database! Try a smaller clip (<800KB).", "error");
                        return;
                    }
                }

                // Update local appearanceData
                appearanceData[key] = data;
                appearanceData[`${key}Type`] = file.type;
                if (callback) callback(data);
                showToast(`${key.toUpperCase()} selected! Click "Save Changes" to apply globally.`, "success");
            };
            reader.readAsDataURL(file);
        });
    }

    handleFile('input-avatar-file', 'avatar-file-name', 'avatar', (data) => {
        const preview = document.querySelector('.preview-avatar');
        if (preview) {
            if (data.startsWith('data:video/')) {
                preview.style.backgroundImage = 'none';
                preview.innerHTML = `<video src="${data}" autoplay loop muted playsinline style="width:100%; height:100%; object-fit:cover; border-radius:50%;"></video>`;
            } else {
                preview.innerHTML = '';
                preview.style.backgroundImage = `url(${data})`;
                preview.style.backgroundSize = 'cover';
            }
        }
    });

    handleFile('input-background-file', 'background-file-name', 'background', (data) => {
        const preview = document.querySelector('.preview-screen');
        if (preview) {
            if (data.startsWith('data:video/')) {
                const existing = preview.querySelector('video.bg-preview');
                if (existing) existing.remove();
                preview.insertAdjacentHTML('afterbegin', `<video class="bg-preview" src="${data}" autoplay loop muted playsinline style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:0;"></video>`);
            } else {
                const existing = preview.querySelector('video.bg-preview');
                if (existing) existing.remove();
                preview.style.backgroundImage = `url(${data})`;
            }
        }
    });

    // --- Link Management ---
    function renderLinks() {
        const container = document.getElementById('links-container');
        if (!container) return;
        container.innerHTML = '';
        userLinks.forEach((link, index) => {
            const div = document.createElement('div');
            div.className = 'link-item';
            div.innerHTML = `
                <div class="link-drag"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg></div>
                <div class="link-inputs">
                    <input type="text" class="link-title" value="${link.title}" onchange="updateLink(${index}, 'title', this.value)">
                    <input type="url" class="link-url" value="${link.url}" onchange="updateLink(${index}, 'url', this.value)">
                </div>
                <button class="btn-delete" onclick="deleteLink(${index})"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
            `;
            container.appendChild(div);
        });
    }

    window.updateLink = (index, key, val) => { userLinks[index][key] = val; };
    window.deleteLink = (index) => { userLinks.splice(index, 1); renderLinks(); };
    document.getElementById('add-link-btn')?.addEventListener('click', () => {
        userLinks.push({ title: 'New Link', url: 'https://' });
        renderLinks();
    });

    // --- Save Logic ---
    async function performGlobalSave() {
        const btn = document.getElementById('save-profile-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="loader"></span> Saving...';
        btn.disabled = true;

        // Sync inputs to appearanceData
        appearanceData.displayName = document.getElementById('input-display-name').value;
        appearanceData.bio = document.getElementById('input-bio').value;
        appearanceData.location = document.getElementById('input-location').value;
        appearanceData.discordId = document.getElementById('input-discord-id').value;
        appearanceData.musicTitle = document.getElementById('input-music-title').value;
        appearanceData.theme = document.querySelector('.theme-btn.active')?.dataset.theme || 'dark';
        appearanceData.avatarEffect = document.querySelector('.effect-btn.active')?.dataset.effect || 'none';

        const payload = {
            username: currentUser,
            ...appearanceData,
            links: userLinks
        };

        try {
            const res = await fetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.success) {
                showToast("Profile saved successfully!");
            } else {
                throw new Error(result.error || "Failed to save");
            }
        } catch (err) {
            showToast(err.message, "error");
            console.error(err);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    document.getElementById('save-profile-btn')?.addEventListener('click', performGlobalSave);

    // Initial render
    renderLinks();
    // Set values
    if (document.getElementById('input-display-name')) {
        document.getElementById('input-display-name').value = appearanceData.displayName;
        document.getElementById('input-bio').value = appearanceData.bio;
        document.getElementById('input-location').value = appearanceData.location;
        document.getElementById('input-discord-id').value = appearanceData.discordId;
        document.getElementById('input-music-title').value = appearanceData.musicTitle;
    }
});

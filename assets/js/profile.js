document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            initializeProfile(user);
        } else {
            window.location.href = 'login.html';
        }
    });
});

function initializeProfile(user) {
    const nameEl = document.getElementById('profile-name');
    const emailEl = document.getElementById('profile-email');
    const avatarEl = document.getElementById('profile-avatar');
    const joinDateEl = document.getElementById('join-date');
    const activeGoalsEl = document.getElementById('active-goals');
    
    const editBtn = document.getElementById('edit-profile-btn');
    const modal = document.getElementById('profile-modal');
    const closeBtn = document.getElementById('close-modal');
    const form = document.getElementById('profile-form');
    
    const logoutBtn = document.getElementById('logout-btn-card');
    const themeToggle = document.getElementById('theme-toggle');

    // --- 1. LOAD DATA ---
    const userRef = db.collection('users').doc(user.uid);
    const goalsRef = db.collection('users').doc(user.uid).collection('goals');

    // Basic Info
    userRef.get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            nameEl.innerText = data.name || 'User';
            emailEl.innerText = user.email;
            
            // Initials for Avatar
            const name = data.name || user.email;
            const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            avatarEl.innerText = initials;

            // Join Date
            // Auth metadata creationTime is standard
            const created = new Date(user.metadata.creationTime);
            if(joinDateEl) joinDateEl.innerText = created.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }
    });

    // Stats: Count Active Goals
    goalsRef.get().then(snap => {
        if(activeGoalsEl) activeGoalsEl.innerText = snap.size;
    });

    // --- 2. EDIT PROFILE ---
    if(editBtn) {
        editBtn.addEventListener('click', () => {
            document.getElementById('edit-name').value = nameEl.innerText;
            document.getElementById('edit-email').value = emailEl.innerText;
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        });
    }

    if(closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        });
    }

    if(form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const newName = document.getElementById('edit-name').value;
            const btn = form.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = 'Saving...';
            
            userRef.update({ name: newName }).then(() => {
                nameEl.innerText = newName;
                const initials = newName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                avatarEl.innerText = initials;
                
                modal.classList.add('hidden');
                modal.classList.remove('flex');
                btn.innerText = originalText;
                if(window.triggerHaptic) window.triggerHaptic(50);
            }).catch(err => {
                console.error(err);
                btn.innerText = originalText;
                alert("Failed to update profile.");
            });
        });
    }

    // --- 3. SETTINGS HANDLERS ---
    
    // Theme Toggle
    if (themeToggle) {
        // Set initial state based on current theme class
        themeToggle.checked = document.documentElement.classList.contains('dark');
        
        themeToggle.addEventListener('change', () => {
            document.body.classList.add('transition-colors', 'duration-300');
            // Check if global toggleTheme exists in theme.js
            if (typeof toggleTheme === 'function') {
                toggleTheme();
            } else {
                // Fallback toggle logic
                if (document.documentElement.classList.contains('dark')) {
                    document.documentElement.classList.remove('dark');
                    localStorage.setItem('theme', 'light');
                } else {
                    document.documentElement.classList.add('dark');
                    localStorage.setItem('theme', 'dark');
                }
            }
            if(window.triggerHaptic) window.triggerHaptic(10);
        });
    }

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if(confirm("Are you sure you want to log out?")) {
                auth.signOut().then(() => window.location.href = 'login.html');
            }
        });
    }
}
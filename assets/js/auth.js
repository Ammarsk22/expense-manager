// --- AUTHENTICATION STATE OBSERVER ---

// Listen for auth state changes
auth.onAuthStateChanged(user => {
    const path = window.location.pathname;
    const isLoginPage = path.includes('login.html');

    if (user) {
        // --- USER IS LOGGED IN ---
        console.log("✅ User authenticated:", user.email);
        
        // If user is on Login page, redirect to Dashboard
        if (isLoginPage) {
            window.location.href = 'index.html';
        }

        // Optional: Load user profile data globally if needed
        // loadUserProfile(user.uid); 

    } else {
        // --- USER IS LOGGED OUT ---
        console.log("❌ User not authenticated");

        // If user is NOT on Login page, redirect to Login
        // We allow staying on login page to avoid infinite loops
        if (!isLoginPage) {
            // Save the page they were trying to visit (Optional future feature)
            // sessionStorage.setItem('redirect_to', window.location.href);
            
            window.location.href = 'login.html';
        }
    }
});

// --- HELPER: GLOBAL LOGOUT FUNCTION ---
// Can be called from anywhere (Settings, Profile, Sidebar)
window.logoutApp = function() {
    if (confirm("Are you sure you want to log out?")) {
        auth.signOut()
            .then(() => {
                console.log("User signed out.");
                window.location.href = 'login.html';
            })
            .catch((error) => {
                console.error("Logout Error:", error);
                alert("Error logging out.");
            });
    }
};

// --- HELPER: CHECK AUTH STATUS ---
// Returns current user or null (Synchronous check not possible with Firebase direct property initially, 
// but useful for quick checks after load)
window.getCurrentUser = function() {
    return auth.currentUser;
};
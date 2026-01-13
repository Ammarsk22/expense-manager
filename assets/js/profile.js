/**
 * FinTrack Profile Manager
 * Handles user profile loading, updating, and saving to Firestore.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Firebase Services
    // Ensure window.auth and window.db are populated from firebase.js
    const auth = window.auth || firebase.auth();
    const db = window.db || firebase.firestore();

    // DOM Elements
    const profileForm = document.getElementById('profile-form');
    const nameInput = document.getElementById('profile-name');
    const emailInput = document.getElementById('profile-email'); // Email field
    const phoneInput = document.getElementById('profile-phone');
    const currencyInput = document.getElementById('profile-currency');
    
    // Display Elements (Card)
    const displayNameEl = document.getElementById('display-name');
    const displayEmailEl = document.getElementById('display-email');
    const profileAvatar = document.getElementById('profile-avatar');
    
    // Buttons
    const saveBtn = document.getElementById('save-profile-btn');
    const logoutBtn = document.getElementById('logout-btn-2');

    // 2. Listen for Auth State Changes
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log("User detected:", user.email);
            loadUserProfile(user);
        } else {
            // Redirect to login if not authenticated
            window.location.href = 'login.html';
        }
    });

    // 3. Load User Profile Data
    async function loadUserProfile(user) {
        // A. Load Basic Auth Data (Email & Photo) immediately
        emailInput.value = user.email || '';
        displayEmailEl.textContent = user.email || 'No Email';
        
        // B. Load Extended Data from Firestore
        try {
            const doc = await db.collection('users').doc(user.uid).get();
            
            if (doc.exists) {
                const data = doc.data();
                
                // Populate Form Fields
                nameInput.value = data.displayName || user.displayName || '';
                phoneInput.value = data.phoneNumber || ''; // Phone number fix
                currencyInput.value = data.currency || 'INR';

                // Update Display Card
                displayNameEl.textContent = data.displayName || user.displayName || 'User';
                
                // Update Avatar if exists
                if (user.photoURL) {
                    profileAvatar.innerHTML = `<img src="${user.photoURL}" class="w-full h-full object-cover">`;
                } else {
                    // Initials
                    const name = data.displayName || user.displayName || 'U';
                    profileAvatar.innerHTML = name.charAt(0).toUpperCase();
                }

            } else {
                // First time user? Pre-fill from Auth
                console.log("No profile doc found, creating defaults...");
                nameInput.value = user.displayName || '';
                displayNameEl.textContent = user.displayName || 'User';
            }
        } catch (error) {
            console.error("Error loading profile:", error);
            alert("Failed to load profile data. Please check your internet.");
        }
    }

    // 4. Save Profile Changes
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const user = auth.currentUser;
            if (!user) return;

            // Show Loading State
            const originalBtnText = saveBtn.innerHTML;
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saving...';

            // Get Input Values
            const updatedData = {
                displayName: nameInput.value.trim(),
                phoneNumber: phoneInput.value.trim(),
                currency: currencyInput.value,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            try {
                // A. Update Firestore (Use set with merge: true to fix "Not Saving" issue)
                await db.collection('users').doc(user.uid).set(updatedData, { merge: true });

                // B. Update Auth Profile (DisplayName)
                if (updatedData.displayName !== user.displayName) {
                    await user.updateProfile({
                        displayName: updatedData.displayName
                    });
                }

                // Update UI immediately
                displayNameEl.textContent = updatedData.displayName;
                
                // Success Feedback
                saveBtn.innerHTML = '<i class="fas fa-check mr-2"></i> Saved!';
                setTimeout(() => {
                    saveBtn.innerHTML = originalBtnText;
                    saveBtn.disabled = false;
                }, 2000);

            } catch (error) {
                console.error("Error saving profile:", error);
                alert("Error saving data: " + error.message);
                
                // Reset Button
                saveBtn.innerHTML = originalBtnText;
                saveBtn.disabled = false;
            }
        });
    }

    // 5. Logout Handler
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.signOut().then(() => {
                window.location.href = 'login.html';
            });
        });
    }
});
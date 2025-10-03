document.addEventListener('DOMContentLoaded', function() {
    auth.onAuthStateChanged(user => {
        if (user && window.location.pathname.endsWith('profile.html')) {
            initializeProfilePage(user);
        }
    });
});

function initializeProfilePage(user) {
    // DOM Elements
    const profileForm = document.getElementById('profile-form');
    const profileNameInput = document.getElementById('profile-name');
    const profileEmailDisplay = document.getElementById('profile-email');
    const profileStatus = document.getElementById('profile-status');

    // --- Populate existing user data ---
    profileEmailDisplay.textContent = user.email || 'No email found';
    profileNameInput.value = user.displayName || '';

    // --- Handle Profile Update ---
    profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newName = profileNameInput.value.trim();

        profileStatus.textContent = 'Saving...';
        profileStatus.className = 'text-gray-500';

        user.updateProfile({
            displayName: newName
        }).then(() => {
            console.log('Profile updated successfully');
            profileStatus.textContent = 'Profile saved successfully!';
            profileStatus.className = 'text-green-600 font-medium';
            setTimeout(() => { profileStatus.textContent = ''; }, 3000);
        }).catch((error) => {
            console.error('Error updating profile:', error);
            profileStatus.textContent = `Error: ${error.message}`;
            profileStatus.className = 'text-red-500';
        });
    });
}
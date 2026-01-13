// This script handles all user authentication logic (signup, login, logout, and auth state).

// Wait for the DOM to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', function () {
    
    // --- AUTHENTICATION STATE OBSERVER ---
    // This function runs whenever the user's login state changes.
    auth.onAuthStateChanged(user => {
        const currentPath = window.location.pathname.split("/").pop();

        if (user) {
            // User is signed in.
            console.log('User is logged in:', user);

            // If the user is on the login page, redirect them to the dashboard.
            if (currentPath === 'login.html' || currentPath === '') {
                window.location.href = 'index.html';
            }

            // You can also populate user-specific info on the dashboard here.
            const userGreeting = document.getElementById('user-greeting');
            if (userGreeting) {
                userGreeting.textContent = `Here's your financial summary, ${user.email}.`;
            }

        } else {
            // User is signed out.
            console.log('User is logged out.');
            
            // If the user is NOT on the login page, redirect them there.
            if (currentPath !== 'login.html') {
                window.location.href = 'login.html';
            }
        }
    });


    // --- LOGIN FORM LOGIC ---
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Prevent form from submitting the default way

            const email = loginForm['login-email'].value;
            const password = loginForm['login-password'].value;
            const errorElement = document.getElementById('login-error');

            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    // Signed in successfully
                    console.log('User logged in:', userCredential.user);
                    errorElement.classList.add('hidden'); // Hide any previous errors
                    // The onAuthStateChanged observer will handle the redirect.
                })
                .catch((error) => {
                    console.error('Login Error:', error);
                    errorElement.textContent = error.message;
                    errorElement.classList.remove('hidden');
                });
        });
    }


    // --- SIGNUP FORM LOGIC ---
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const email = signupForm['signup-email'].value;
            const password = signupForm['signup-password'].value;
            const confirmPassword = signupForm['signup-password-confirm'].value;
            const errorElement = document.getElementById('signup-error');

            // Basic validation
            if (password !== confirmPassword) {
                errorElement.textContent = "Passwords do not match.";
                errorElement.classList.remove('hidden');
                return; // Stop the function
            }

            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    // Signed up and signed in successfully
                    console.log('User signed up:', userCredential.user);
                     errorElement.classList.add('hidden');
                    // The onAuthStateChanged observer will handle the redirect.
                })
                .catch((error) => {
                    console.error('Signup Error:', error);
                    errorElement.textContent = error.message;
                    errorElement.classList.remove('hidden');
                });
        });
    }


    // --- LOGOUT BUTTON LOGIC ---
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            auth.signOut().then(() => {
                // Sign-out successful.
                console.log('User logged out.');
                // The onAuthStateChanged observer will handle the redirect to login.html.
            }).catch((error) => {
                console.error('Logout Error:', error);
                alert('Error logging out. Please try again.');
            });
        });
    }

});


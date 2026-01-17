document.addEventListener('DOMContentLoaded', () => {
    // --- REFERENCES ---
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const toggleBtn = document.getElementById('toggle-auth');
    const toggleText = document.getElementById('toggle-text');
    const forgotBtn = document.getElementById('forgot-password-link');
    const googleBtn = document.getElementById('google-login-btn');

    // --- 1. TOGGLE LOGIN / SIGNUP VIEW ---
    let isLoginView = true;

    // Helper to handle toggle click
    function handleToggle(e) {
        if(e) e.preventDefault();
        isLoginView = !isLoginView;
        
        if (isLoginView) {
            // Show Login
            signupForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
            // Update Footer Text
            toggleText.innerHTML = `Don't have an account? <button id="toggle-auth" class="font-bold text-indigo-600 dark:text-indigo-400 hover:underline ml-1">Sign Up</button>`;
        } else {
            // Show Signup
            loginForm.classList.add('hidden');
            signupForm.classList.remove('hidden');
            // Update Footer Text
            toggleText.innerHTML = `Already have an account? <button id="toggle-auth" class="font-bold text-indigo-600 dark:text-indigo-400 hover:underline ml-1">Sign In</button>`;
        }
        
        // Re-attach listener to the new button (since innerHTML replaced it)
        document.getElementById('toggle-auth').addEventListener('click', handleToggle);
    }

    // Initial Attach
    if (toggleBtn) toggleBtn.addEventListener('click', handleToggle);


    // --- 2. LOGIN LOGIC ---
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const btn = loginForm.querySelector('button');
            const oldText = btn.innerText;

            btn.innerText = "Signing in...";
            btn.disabled = true;

            auth.signInWithEmailAndPassword(email, password)
                .then(() => {
                    window.location.href = 'index.html';
                })
                .catch((error) => {
                    alert(error.message);
                    btn.innerText = oldText;
                    btn.disabled = false;
                });
        });
    }

    // --- 3. SIGNUP LOGIC ---
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const btn = signupForm.querySelector('button');
            const oldText = btn.innerText;

            btn.innerText = "Creating Account...";
            btn.disabled = true;

            auth.createUserWithEmailAndPassword(email, password)
                .then((cred) => {
                    // Save Name
                    return db.collection('users').doc(cred.user.uid).set({
                        name: name,
                        email: email,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                })
                .then(() => {
                    window.location.href = 'index.html';
                })
                .catch((error) => {
                    alert(error.message);
                    btn.innerText = oldText;
                    btn.disabled = false;
                });
        });
    }

    // --- 4. GOOGLE LOGIN ---
    if (googleBtn) {
        googleBtn.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider)
                .then((result) => {
                    // Check if user exists in DB, if not create
                    const user = result.user;
                    const userRef = db.collection('users').doc(user.uid);
                    
                    userRef.get().then((doc) => {
                        if (!doc.exists) {
                            userRef.set({
                                name: user.displayName,
                                email: user.email,
                                createdAt: firebase.firestore.FieldValue.serverTimestamp()
                            });
                        }
                        window.location.href = 'index.html';
                    });
                })
                .catch((error) => {
                    alert("Google Sign In Error: " + error.message);
                });
        });
    }

    // --- 5. FORGOT PASSWORD ---
    if (forgotBtn) {
        forgotBtn.addEventListener('click', () => {
            const email = document.getElementById('login-email').value;
            if(!email) {
                alert("Please enter your email address in the login field first.");
                return;
            }
            
            const originalText = forgotBtn.innerText;
            forgotBtn.innerText = "Sending...";
            
            auth.sendPasswordResetEmail(email)
                .then(() => {
                    alert(`Password reset link sent to ${email}`);
                    forgotBtn.innerText = "Link Sent!";
                })
                .catch(error => {
                    alert(error.message);
                    forgotBtn.innerText = originalText;
                });
        });
    }
});
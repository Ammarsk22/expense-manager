// --- FIREBASE CONFIGURATION ---
// Replace the values below with your own Firebase project configuration if needed.
const firebaseConfig = {
  apiKey: "AIzaSyD7b0EZiWLLx_Yb1Su3Id4l8ZiB7W4kfOQ", 
  authDomain: "personal-expensemanager-39eec.firebaseapp.com",
  projectId: "personal-expensemanager-39eec",
  storageBucket: "personal-expensemanager-39eec.firebasestorage.app",
  messagingSenderId: "366871929721",
  appId: "1:366871929721:web:eab5d6904d13e48054c5a8",
  measurementId: "G-6XBN1Q5EL9"
};

// --- INITIALIZE FIREBASE ---
// Check if firebase is already initialized to avoid errors
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
} else {
    firebase.app(); // if already initialized, use that one
}

// --- INITIALIZE SERVICES ---
const auth = firebase.auth();
const db = firebase.firestore();

// --- ENABLE OFFLINE PERSISTENCE (PWA Feature) ---
// This allows the app to work without internet connection
db.enablePersistence()
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            // Multiple tabs open, persistence can only be enabled in one tab at a time.
            console.warn('Persistence failed: Multiple tabs open');
        } else if (err.code == 'unimplemented') {
            // The current browser does not support all of the features required to enable persistence
            console.warn('Persistence not supported in this browser');
        }
    });

// --- GLOBAL EXPORTS ---
// Make auth and db available globally for other scripts (auth.js, main.js, etc.)
window.auth = auth;
window.db = db;
window.firebaseConfig = firebaseConfig; // Helpful for debugging

console.log("🔥 Firebase initialized with Offline Persistence.");
const firebaseConfig = {
  // Your specific API Key has been inserted here.
  // IMPORTANT: For security, it is recommended to regenerate this key.
  apiKey: "AIzaSyD7b0EZiWLLx_Yb1Su3Id4l8ZiB7W4kfOQ", 
  authDomain: "personal-expensemanager-39eec.firebaseapp.com",
  projectId: "personal-expensemanager-39eec",
  storageBucket: "personal-expensemanager-39eec.firebasestorage.app",
  messagingSenderId: "366871929721",
  appId: "1:366871929721:web:eab5d6904d13e48054c5a8",
  measurementId: "G-6XBN1Q5EL9"
};

// Initialize Firebase using the "compat" version of the SDK
const app = firebase.initializeApp(firebaseConfig);

// Make Firebase services available for other scripts to use
const auth = firebase.auth();
const db = firebase.firestore();

console.log("Firebase initialized successfully.");


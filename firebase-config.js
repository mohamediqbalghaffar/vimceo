// ════════════════════════════════════════════════
// FIREBASE CONFIGURATION
// ════════════════════════════════════════════════
// 1. Go to https://console.firebase.google.com
// 2. Create a new project (or use an existing one)
// 3. Click the </> web app icon to register a web app
// 4. Copy your firebaseConfig values below
// 5. In Firestore Database: create database in TEST MODE
// ════════════════════════════════════════════════

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

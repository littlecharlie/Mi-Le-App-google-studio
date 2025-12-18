import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBudLxgIvQwUfnVY4IfBJQkXCZvqD-BPYs",
  authDomain: "mi-le-garden-studio.firebaseapp.com",
  projectId: "mi-le-garden-studio",
  storageBucket: "mi-le-garden-studio.firebasestorage.app",
  messagingSenderId: "90026726350",
  appId: "1:90026726350:web:5a9ece9b31b77e6423119f",
  measurementId: "G-QKB6K9WK7Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app, "db-mile-8858");

// Check if configured (used by App.tsx to show warning)
export const isConfigured = firebaseConfig.projectId !== "your-project-id";

// Export the instances so other files can use them
export { app, db };
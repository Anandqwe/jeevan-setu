import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// TODO: Replace with your actual Firebase project configuration
// You can get this from the Firebase Console -> Project Settings -> General -> Your apps
const firebaseConfig = {
  apiKey: "AIzaSyAHgRnrDEZksauw7xQTcEOJT_fu6VpPoRI",
  authDomain: "jeevansetu-a0f19.firebaseapp.com",
  projectId: "jeevansetu-a0f19",
  storageBucket: "jeevansetu-a0f19.firebasestorage.app",
  messagingSenderId: "814302372526",
  appId: "1:814302372526:web:5f172fcc0db455c34a833f",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

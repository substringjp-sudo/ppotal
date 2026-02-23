import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAvyFrKYZXqPo2_O6nTTDtpPCm4N4sWHfQ",
    authDomain: "jprail.firebaseapp.com",
    projectId: "jprail",
    storageBucket: "jprail.firebasestorage.app",
    messagingSenderId: "90145127208",
    appId: "1:90145127208:web:5a2eccb9a6008906326e1d"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };

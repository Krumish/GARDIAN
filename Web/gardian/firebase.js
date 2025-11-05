import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBiM_ZoQMxNMjUMYbJV-pStnCVZKfuJoHk",
  authDomain: "gardian-2d7e5.firebaseapp.com",
  projectId: "gardian-2d7e5",
  storageBucket: "gardian-2d7e5.firebasestorage.app",
  messagingSenderId: "976234026245",
  appId: "1:976234026245:web:82b8cfd50356acc15ed36c",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);
export const db = getFirestore(app);
export const storage = getStorage(app);

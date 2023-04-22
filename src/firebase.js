import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { collection, addDoc, query, where, onSnapshot } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCdQQ2LtnqZBIRLZY6FZManAiR1TnRgrjc",
    authDomain: "game-findinator.firebaseapp.com",
    projectId: "game-findinator",
    storageBucket: "game-findinator.appspot.com",
    messagingSenderId: "826915355505",
    appId: "1:826915355505:web:92fef7d5e56595c2aa94d0",
    measurementId: "G-K1FRHPGGP8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, collection, addDoc, query, where, onSnapshot };

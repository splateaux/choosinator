import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import logger from './logger';
import { collection, orderBy, deleteDoc, getDoc, getDocs, updateDoc, doc, addDoc, query, where, onSnapshot } from "firebase/firestore";

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

async function getDocsLogged(q) {
  logger.info(`getDocs: ${JSON.stringify(q)}`);
  return await getDocs(q);
}

async function addDocLogged(collectionRef, data) {
  logger.info(`addDoc: collection=${collectionRef.path}, data=${JSON.stringify(data)}`);
  return await addDoc(collectionRef, data);
}

function onSnapshotLogged(q, callback) {
  logger.info(`onSnapshot: ${JSON.stringify(q)}`);
  return onSnapshot(q, callback);
}

async function updateDocLogged(docRef, data) {
  logger.info(`updateDoc: doc=${docRef.path}, data=${JSON.stringify(data)}`);
  return await updateDoc(docRef, data);
}

async function deleteDocLogged(docRef) {
  logger.info(`deleteDoc: doc=${docRef.path}`);
  return await deleteDoc(docRef);
}


export {
  db, 
  query, 
  where,
  doc,
  collection,
  orderBy,
  addDocLogged as addDoc,
  onSnapshotLogged as onSnapshot,
  getDocsLogged as getDocs,
  updateDocLogged as updateDoc,
  deleteDocLogged as deleteDoc,
};

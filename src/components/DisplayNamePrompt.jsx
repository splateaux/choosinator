import React, { useState, useEffect  } from "react";
import { addDoc, where, query, collection, onSnapshot, getDocs, updateDoc, deleteDoc } from '../firebase';
import { db } from '../firebase';
import randomcolor from 'randomcolor';
import { useParams } from 'react-router-dom';

const DisplayNamePrompt = ({ onDisplayNameSubmit }) => {
  const [displayName, setDisplayName] = useState("");
  const { eventCode } = useParams();  

  useEffect(() => {
    const savedDisplayName = localStorage.getItem('displayName');
    if (savedDisplayName) {
      onDisplayNameSubmit(savedDisplayName);
    }
  }, [onDisplayNameSubmit]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const eventsRef = collection(db, `events`);
    const q = query(eventsRef, where('name', '==', eventCode));

    const querySnapshot = await getDocs(q);
    const events = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const event = events[0];
    if (event === undefined) {
      alert('Invalid game id');
      return;
    }

    if (displayName.trim() === '') {
        alert('Display name cannot be empty');
        return;
      }

    const userColor = randomcolor();
    const newUser = { displayName, color: userColor };      

    const docRef = await addDoc(collection(db, `events/${event.id}/users`), newUser);
    localStorage.setItem('displayName', displayName);
    localStorage.setItem('userColor', userColor);
    localStorage.setItem('userId', docRef.id);
    localStorage.setItem('eventId', event.id);
    
    onDisplayNameSubmit(displayName);
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Display Name:
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />
      </label>
      <button type="submit">Submit</button>
    </form>
  );
};

export default DisplayNamePrompt;

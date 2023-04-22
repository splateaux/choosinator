import React, { useState, useEffect  } from "react";
import { collection, onSnapshot, query, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import randomcolor from 'randomcolor';
import { useParams } from 'react-router-dom';

const DisplayNameForm = ({ onDisplayNameSubmit }) => {
  const [displayName, setDisplayName] = useState("");
  const { eventId } = useParams();  

  useEffect(() => {
    const savedDisplayName = localStorage.getItem('displayName');
    if (savedDisplayName) {
      onDisplayNameSubmit(savedDisplayName);
    }
  }, [onDisplayNameSubmit]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (displayName.trim() === '') {
        alert('Display name cannot be empty');
        return;
      }

    const userColor = randomcolor();
    const newUser = { displayName, color: userColor };      

    await addDoc(collection(db, `events/${eventId}/users`), newUser);
    localStorage.setItem('displayName', displayName);

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

export default DisplayNameForm;

import React, { useState, useEffect  } from "react";
import { addDoc, where, query, collection, onSnapshot, getDocs, updateDoc, deleteDoc } from '../firebase';
import { db } from '../firebase';

const DisplayNamePrompt = ({ onDisplayNameSubmit, event}) => {
  const [displayName, setDisplayName] = useState("");

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
    
    onDisplayNameSubmit(displayName);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1>Choose a display name for the game choosinating!</h1> 
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

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { addDoc, where, query, collection, onSnapshot, getDocs, updateDoc, deleteDoc } from '../firebase';
import { db } from '../firebase';
import DisplayNamePrompt from "./DisplayNamePrompt.jsx";
import UserList from "./UserList";

const GameChoosingPage = () => {
  const { eventCode } = useParams();
  const [displayName, setDisplayName] = useState(null);
  const [event, setEvent] = useState(null);

  useEffect(() => {
    const getEvent = async () => {
      const eventsRef = collection(db, `events`);
      const q = query(eventsRef, where('name', '==', eventCode));
  
      const querySnapshot = await getDocs(q);
      const events = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
  
      const foundEvent = events[0];
      if (foundEvent == null) {
        alert("Invalid Event");
        return null;
      }

      return foundEvent;
    };

    if (event == null || event.name != eventCode) {
      getEvent().then((event) => {
        if (event != null) {
          setEvent(event);
        }
      });
    }

  }, [eventCode]);

  const handleDisplayNameSubmit = (name) => {
    setDisplayName(name);
  };

  return (
    <div>
      <h1>What are we playing tonight?</h1>
      {
        event ? (
          displayName ? (
            <UserList event={event}/>             
          ) : (
            <DisplayNamePrompt onDisplayNameSubmit={handleDisplayNameSubmit} event={event} />
          )
        ): (
          <div>Fuck off!</div>
        )
      }
    </div>
  );
};

export default GameChoosingPage;

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

const UserList = () => {
  const { eventId } = useParams();
  const [users, setUsers] = useState([]);
  const currentUserDisplayName = localStorage.getItem('displayName');  

  useEffect(() => {
    const usersRef = collection(db, `events/${eventId}/users`);
    const q = query(usersRef, orderBy('displayName'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedUsers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(fetchedUsers);
    });

    return () => unsubscribe();
  }, [eventId]);

  return (
    <div>
      <h2>Participants:</h2>
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            <span
              style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: user.color,
                marginRight: '8px',
              }}
            ></span>
            <span style={user.displayName === currentUserDisplayName ? { color: 'yellow' } : {}}>
              {user.displayName}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UserList;

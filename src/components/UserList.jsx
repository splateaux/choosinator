import React, { useState, useEffect } from 'react';
import { addDoc, doc, db, query, collection, onSnapshot, orderBy, updateDoc, deleteDoc } from '../firebase';
import GameSelectionWithPoints from './GameSelectionWithPoints';
import UserPointsBarChart from './UserPointsBarChart';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const currentUserDisplayName = localStorage.getItem('displayName');
  const currentEventId = localStorage.getItem('eventId');
  const [games, setGames] = useState([]); 
  const [allUserPoints, setAllUserPoints] = useState({});  

  useEffect(() => {
    try{
        const usersRef = collection(db, `events/${currentEventId}/users`);
        const q = query(usersRef, orderBy('displayName'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const fetchedUsers = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
          }));
          setUsers(fetchedUsers);
        });

        
        return () => unsubscribe();
    } catch (error) {
        console.error("Error getting event users: ", error);
    }  

  }, []);

  useEffect(() => {
    const pointsRef = collection(db, `events/${currentEventId}/points`);
    const q = query(pointsRef);
  
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPoints = snapshot.docs.reduce((acc, doc) => {
        const userId = doc.id;
        const userPoints = doc.data();
        Object.entries(userPoints).forEach(([gameId, gameData]) => {
          if (!acc[gameId]) {
            acc[gameId] = [];
          }
          acc[gameId].push({ userId, ...gameData[userId] });
        });
        return acc;
      }, {});
      setAllUserPoints(fetchedPoints);
    });
  
    return () => unsubscribe();
  }, [currentEventId]);

  // Fetch games data
  useEffect(() => {
    const gamesRef = collection(db, 'games');
    const q = query(gamesRef, orderBy('name'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedGames = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setGames(fetchedGames);
    });

    return () => unsubscribe();
  }, []);

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
      <GameSelectionWithPoints />
      <UserPointsBarChart data={allUserPoints} games={games} users={users} />
    </div>
  );
};

export default UserList;

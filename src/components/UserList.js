import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { addDoc, doc, db, query, collection, onSnapshot, orderBy, updateDoc, deleteDoc } from '../firebase';
import GameSelectionWithPoints from './GameSelectionWithPoints';
import CustomBarChart from './BarChart';

const UserList = () => {
  const { eventCode } = useParams();
  const [users, setUsers] = useState([]);
  const currentUserDisplayName = localStorage.getItem('displayName');
  const currentEventId = localStorage.getItem('eventId');
  const [userPoints, setUserPoints] = useState({});
  const [games, setGames] = useState([]); 

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
      <GameSelectionWithPoints onPointsUpdate={setUserPoints} />
      <CustomBarChart data={userPoints} games={games} users={users} />
      {/* <CustomBarChart data={userPoints} games={games}/> */}
    </div>
  );
};

export default UserList;

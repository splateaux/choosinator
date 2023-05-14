import React, { useState, useEffect } from 'react';
import { addDoc, doc, db, query, collection, onSnapshot, orderBy, updateDoc, deleteDoc } from '../firebase';
import GameSelectionWithPoints from './GameSelectionWithPoints';
import UserPointsBarChart from './UserPointsBarChart';
import distinctColors from 'distinct-colors';

const UserList = ({event}) => {
  const [users, setUsers] = useState([]);
  const currentUserDisplayName = localStorage.getItem('displayName');
  const [currentUser, setUser] = useState(null);
  const [games, setGames] = useState([]); 
  const [allUserPoints, setAllUserPoints] = useState({});  
  const [usersFetched, setUsersFetched] = useState(false);
  const palette = distinctColors({ count: 20 });
  const [nextColorIndex, setNextColorIndex] = useState(0);

  function getNextColor() {
    const color = palette[nextColorIndex];
    return color.toString();
  }

  useEffect(() => {
    try{
        // Go get all users for this event
        const usersRef = collection(db, `events/${event.id}/users`);
        const q = query(usersRef, orderBy('displayName'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const fetchedUsers = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
          }));
          setUsers(fetchedUsers);
          setNextColorIndex(Math.max(19, fetchedUsers.length + 1)); // just a ghetto way of prevening going over our color pallete limit
          setUsersFetched(true);
        });

        return () => unsubscribe();
    } catch (error) {
        console.error("Error getting event users: ", error);
    }  

  }, []);

  useEffect(() => {
    const addUser = async (user) => {
      const docRef = await addDoc(collection(db, `events/${event.id}/users`), user);
      user.id = docRef.id;
      return user;
    };

    if (!usersFetched) return;
    // See if the current user is one this event already
    var foundUser = users.find(u => u.displayName === currentUserDisplayName);
    if (!foundUser) {
      // If we didn't find them, make a new user for this event
      const userColor = getNextColor();
      const newUser = { displayName: currentUserDisplayName, color: userColor };      
  
      addUser(newUser).then((createdUser) => {
        setUser(createdUser);
      });
    } else {
      setUser(foundUser);
    }

  }, [users]);

  useEffect(() => {
    if (currentUser != null && currentUser != undefined) {
      var foundUser = users.find(u => u.displayName === currentUserDisplayName);

      if (!foundUser) {
        const newUsers = users.concat(currentUser);
        setUsers(newUsers);
      }

      // Store what we've got
      localStorage.setItem('userColor', currentUser.color);
      localStorage.setItem('userId', currentUser.id);  
    }
  }, [currentUser]);

  useEffect(() => {
    const pointsRef = collection(db, `events/${event.id}/points`);
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
  }, [event.id]);

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
      <h1>What are we playing tonight?</h1>      
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
      <GameSelectionWithPoints event={event}/>
      <UserPointsBarChart data={allUserPoints} games={games} users={users} />
    </div>
  );
};

export default UserList;

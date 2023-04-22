import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

const GameSelectionWithPoints = ({ onPointsUpdate }) => {
  const [games, setGames] = useState([]);
  const [points, setPoints] = useState({});
  const maxPoints = 100;
  const [remainingBalance, setRemainingBalance] = useState(maxPoints);
  const [errors, setErrors] = useState({});
  const currentUserColor = localStorage.getItem("userColor");
  const currentUserId = localStorage.getItem('userId');

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

  const handlePointsChange = (gameId, value, userId) => {
    const updatedPointData = {
      points: parseInt(value) || 0,
      color: currentUserColor,
      userId: currentUserId,
    };

    const newPoints = {
      ...points,
      [gameId]: updatedPointData,
    };

    const totalPoints = Object.values(newPoints).reduce(
      (acc, curr) => acc + curr.points,
      0
    );

    const newErrors = { ...errors, [gameId]: totalPoints > maxPoints };

    if (totalPoints > maxPoints) {
      alert('Cheater!');
      setErrors(newErrors);
      return;
    }

    setPoints(newPoints);
    setRemainingBalance(maxPoints - totalPoints);
    setErrors(newErrors);

    if (onPointsUpdate) {
      onPointsUpdate(newPoints);
    }
  };

  return (
    <div>
      <h2>Game Selection With Points</h2>
      {games.map((game) => (
        <div key={game.id}>
          <span>{game.name}</span>
          <input
            type="number"
            min="0"
            max="{maxPoints}"
            value={points[game.id]?.points || ''}
            onChange={(e) => handlePointsChange(game.id, e.target.value)}
          />
        </div>
      ))}
      <div>Remaining balance: {remainingBalance}</div>
    </div>
  );
};

export default GameSelectionWithPoints;

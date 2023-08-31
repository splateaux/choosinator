import React, { useState, useEffect } from 'react';
import { db, orderBy, doc, query, collection, onSnapshot, getDoc, updateDoc, setDoc } from '../firebase';
import styles from './GameSelectionWithPoints.module.css';

const GameSelectionWithPoints = ({event}) => {
  const [games, setGames] = useState([]);
  const [points, setPoints] = useState({});
  const maxPoints = 100;
  const [remainingBalance, setRemainingBalance] = useState(maxPoints);
  const [errors, setErrors] = useState({});
  const currentUserColor = localStorage.getItem("userColor");
  const currentUserId = localStorage.getItem('userId');

  useEffect(() => {
    const gamesRef = collection(db, 'games_lancon');
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

  const handleClearAllPoints = () => {
    setPoints({});
    setRemainingBalance(maxPoints);
    setErrors({});

    const pointsRef = doc(db, `events/${event.id}/points/${currentUserId}`);
    getDoc(pointsRef).then((docSnapshot) => {
      if (docSnapshot.exists()) {
        const clearedPointsData = games.reduce((acc, game) => {
          acc[game.id] = { [currentUserId]: { points: 0, color: currentUserColor, userId: currentUserId }};
          return acc;
        }, {});

        updateDoc(pointsRef, clearedPointsData);
      }
    });
  };  

  const handlePointsChange = (gameId, value) => {

    if (value < 0)
    {
      alert('Cheater!');
      return;
    }

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

    const pointsRef = doc(db, `events/${event.id}/points/${currentUserId}`);
    getDoc(pointsRef).then((docSnapshot) => {
      if (docSnapshot.exists()) {
        updateDoc(pointsRef, {
          [`${gameId}.${currentUserId}`]: updatedPointData,
        });
      } else {
        setDoc(pointsRef, {
          [gameId]: {
            [currentUserId]: updatedPointData,
          },
        });
      }
    });    

  };

  const chunk = (arr, size) =>
    arr.reduce((chunks, el, i) => {
      if (i % size === 0) {
        chunks.push([el]);
      } else {
        chunks[chunks.length - 1].push(el);
      }
      return chunks;
    }, []);

  const gamesInColumns = chunk(games, Math.ceil(games.length / 3));  

  return (
    <div>
      <h2>Spend your points wisely!</h2>
      <div className={styles.gameList}>
        {gamesInColumns.map((column, columnIndex) => (
          <div key={`column-${columnIndex}`} className={styles.column}>
            {column.map((game) => (
              <div key={game.id} className={styles.gameListItem}>
                <span>{game.name}</span>
                <input
                  type="number"
                  min="0"
                  max="{maxPoints}"
                  value={points[game.id]?.points || ''}
                  onChange={(e) => handlePointsChange(game.id, e.target.value)}
                  className={styles.pointsInput}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div>Remaining balance: {remainingBalance}</div>
      <button onClick={handleClearAllPoints}>Clear All Points</button>      
    </div>
  );
};

export default GameSelectionWithPoints;

import React, { useState, useEffect } from 'react';
import { addDoc, doc, db, query, collection, onSnapshot, orderBy, updateDoc, deleteDoc } from '../firebase';
import stringSimilarity from "string-similarity";
import { nanoid } from 'nanoid';

const Setup = () => {
  const [games, setGames] = useState([]);
  const [newGame, setNewGame] = useState('');
  const [selectedGame, setSelectedGame] = useState(null);
  const [uniqueUrl, setUniqueUrl] = useState('');
  const [copyMessage, setCopyMessage] = useState('');

  useEffect(() => {
    const q = query(collection(db, "games_lancon"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const _games = [];

      querySnapshot.forEach((doc) => {
        _games.push({ id: doc.id, ...doc.data() });
      });

      setGames(_games);
    });

    return () => unsubscribe();
  }, []);
  
  const handleAddGame = async () => {
      if (!IsNameValid(newGame)) return;

      try {
          const response = await addDoc(collection(db, "games_lancon"), {
              name: newGame,
              });
  
          setGames([...games, { id: response.id, name: newGame }]);
          setNewGame("");            
      } catch (error) {
          console.error("Error adding document: ", error);
      } 
  };

  function IsNameValid(gameName)
    {
        if (gameName.trim() === "") {
            alert("Please enter a game name.");
            return false;
          }
      
          let isDuplicate = false;
      
          for (const game of games) {
            const similarity = stringSimilarity.compareTwoStrings(gameName.toLowerCase(), game.name.toLowerCase());
      
            if (similarity > 0.85) {
              isDuplicate = true;
              break;
            }
          }
      
          if (isDuplicate) {
            alert("A game with a similar name already exists.");
            return false;
          }

        return true;
    }

  const copyLinkToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(`${uniqueUrl}`);
      setCopyMessage('Link copied to clipboard!');
    } catch (err) {
      setCopyMessage('Failed to copy link');
    }
  };  

  const handleUpdateGame = async (id, name) => {
    if (!IsNameValid(name)) return;

    await updateDoc(doc(db, 'games_lancon', id), { name });
    setSelectedGame(null);
  };

  const handleDeleteGame = async (id) => {
    await deleteDoc(doc(db, 'games_lancon', id));
  };

  const handleCreateEvent = async () => {
    const eventId = nanoid(6);
    await addDoc(collection(db, 'events'), { name: eventId });    
    setUniqueUrl(`${window.location.origin}/${eventId}`);
  };

  return (
    <div>
      <h1>Setup / Event Creator</h1>
      <div>
        <input
          type="text"
          value={newGame}
          onChange={(e) => setNewGame(e.target.value)}
          placeholder="New game name"
        />
        <button onClick={handleAddGame}>Add Game</button>
      </div>
      <div>
        <h2>Games List:</h2>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
          }}
        >
          {games.map((game) => (
            <div
              key={game.id}
              style={{
                flexBasis: '30%',
                marginBottom: '1rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-start',
                  alignItems: 'center'
                }}
              >
                <button onClick={() => handleDeleteGame(game.id)}>Delete</button>                
                {selectedGame === game.id ? (
                  <input
                    type="text"
                    defaultValue={game.name}
                    onBlur={(e) => handleUpdateGame(game.id, e.target.value)}
                  />
                ) : (
                  <span onClick={() => setSelectedGame(game.id)}>{game.name}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h2>Create Event:</h2>
        <button onClick={handleCreateEvent}>Generate Unique URL</button>
        {uniqueUrl && <div>Unique URL: {uniqueUrl}</div>}
      </div>
      <div>
        <h3>Unique URL:</h3>
        <input
          type="text"
          readOnly
          value={`${uniqueUrl}`}
          style={{ width: '20%' }}
        />
        <button onClick={copyLinkToClipboard}>Copy URL</button>
        {copyMessage && <p>{copyMessage}</p>}
        </div>      
    </div>
  );
};

export default Setup;

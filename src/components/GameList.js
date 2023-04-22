import React, { useState, useEffect } from "react";
import { collection, addDoc, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import stringSimilarity from "string-similarity";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";

const GameList = () => {
  const [games, setGames] = useState([]);
  const [newGame, setNewGame] = useState("");

  useEffect(() => {
    const q = query(collection(db, "games"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const _games = [];

      querySnapshot.forEach((doc) => {
        _games.push({ id: doc.id, ...doc.data() });
      });

      setGames(_games);
    });

    return () => unsubscribe();
  }, []);

  const addGame = async () => {
    if (newGame.trim() === "") {
      alert("Please enter a game name.");
      return;
    }

    let isDuplicate = false;

    for (const game of games) {
      const similarity = stringSimilarity.compareTwoStrings(newGame.toLowerCase(), game.name.toLowerCase());

      if (similarity > 0.85) {
        isDuplicate = true;
        break;
      }
    }

    if (isDuplicate) {
      alert("A game with a similar name already exists.");
      return;
    }
    try {
        const response = await addDoc(collection(db, "games"), {
            name: newGame,
            });

        setGames([...games, { id: response.id, name: newGame }]);
        setNewGame("");            
    } catch (error) {
        console.error("Error adding document: ", error);
    }    
  };

  return (
    <div>
      <h1>Game List</h1>
      <div>
        <TextField
          label="New Game"
          variant="outlined"
          value={newGame}
          style={{ backgroundColor: "white", color: "black" }}          
          onChange={(e) => setNewGame(e.target.value)}
        />
        <Button onClick={addGame} variant="contained">
          Add Game
        </Button>
      </div>
      <ul>
        {games.map((game) => (
          <li key={game.id}>{game.name}</li>
        ))}
      </ul>
    </div>
  );
};

export default GameList;

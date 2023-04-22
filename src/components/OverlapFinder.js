import React, { useState, useEffect } from "react";
import { db, collection, addDoc, query, where, onSnapshot } from "../firebase";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Typography from "@mui/material/Typography";

function OverlapFinder() {
  const [events, setEvents] = useState([]);
  const [games, setGames] = useState({});
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [overlappingGames, setOverlappingGames] = useState([]);

  useEffect(() => {
    const unsubscribeEvents = onSnapshot(collection(db, "events"), (snapshot) => {
      const events = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEvents(events);
    });

    const unsubscribeGames = onSnapshot(collection(db, "games"), (snapshot) => {
      const games = snapshot.docs.reduce(
        (acc, doc) => ({ ...acc, [doc.id]: doc.data().name }),
        {}
      );
      setGames(games);
    });

    return () => {
      unsubscribeEvents();
      unsubscribeGames();
    };
  }, []);

  const findOverlap = () => {
    if (!selectedEvent) return;

    const event = events.find((event) => event.id === selectedEvent);
    const gameCounts = event.games.reduce((acc, gameId) => {
      acc[gameId] = (acc[gameId] || 0) + 1;
      return acc;
    }, {});

    const overlapping = Object.entries(gameCounts)
      .filter(([, count]) => count > 1)
      .map(([gameId]) => games[gameId]);

    setOverlappingGames(overlapping);
  };

  return (
    <div>
      <h2>Find Overlapping Games</h2>
      <select
        value={selectedEvent}
        onChange={(e) => setSelectedEvent(e.target.value)}
      >
        <option value="">Select an event</option>
        {events.map((event) => (
          <option key={event.id} value={event.id}>
            {event.name}
          </option>
        ))}
      </select>
      <Button onClick={findOverlap}>Find Overlap</Button>
      {overlappingGames.length > 0 && (
        <>
          <Typography>Overlapping Games:</Typography>
          <List>
            {overlappingGames.map((game, index) => (
              <ListItem key={index}>{game}</ListItem>
            ))}
          </List>
        </>
      )}
    </div>
  );
}

export default OverlapFinder;

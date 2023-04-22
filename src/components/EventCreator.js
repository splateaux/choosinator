import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const EventCreator = ({ games }) => {
  const [selectedGames, setSelectedGames] = useState([]);
  const [startDate, setStartDate] = useState(new Date());
  const [events, setEvents] = useState([]);

  const handleCheckboxChange = (e) => {
    if (e.target.checked) {
      setSelectedGames([...selectedGames, e.target.value]);
    } else {
      setSelectedGames(selectedGames.filter((game) => game !== e.target.value));
    }
  };

  const createEvent = async () => {
    const newEvent = {
      games: selectedGames,
      date: startDate,
    };

    const docRef = await addDoc(collection(db, 'events'), newEvent);
    setEvents([...events, { ...newEvent, id: docRef.id }]);
  };

  return (
    <div className="event-creator">
      <h2>Create Event</h2>
      <div className="game-selection">
        {games &&
            games.map((game) => (
            <label key={game.id}>
                <input
                type="checkbox"
                value={game.name}
                onChange={handleCheckboxChange}
                />
                {game.name}
            </label>
            ))}
        </div>

      <DatePicker
        selected={startDate}
        onChange={(date) => setStartDate(date)}
        dateFormat="Pp"
      />
      <button onClick={createEvent}>Create Event</button>
    </div>
  );
};

export default EventCreator;

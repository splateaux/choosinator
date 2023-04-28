// src/components/GameChoosingPage.js

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import DisplayNameForm from "./DisplayNameForm";
import UserList from "./UserList";
import GameSelectionWithPoints from "./GameSelectionWithPoints";
import BarChart from "./BarChart";

const GameChoosingPage = () => {
  const { eventCode } = useParams();
  const [displayName, setDisplayName] = useState(null);

  useEffect(() => {
    // TODO: Add logic to fetch event data using eventCode and subscribe to changes.
  }, [eventCode]);

  const handleDisplayNameSubmit = (name) => {
    setDisplayName(name);
    // TODO: Assign random color to user and save user data.
  };

  return (
    <div>
      <h1>What are we playing tonight?</h1>
      {displayName ? (
        <>
          {/* <GameSelectionWithPoints /> */}
          <UserList />
          {/* <BarChart /> */}
        </>
      ) : (
        <DisplayNameForm onDisplayNameSubmit={handleDisplayNameSubmit} />
      )}
    </div>
  );
};

export default GameChoosingPage;

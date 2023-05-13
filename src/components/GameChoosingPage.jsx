import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import DisplayNamePrompt from "./DisplayNamePrompt.jsx";
import UserList from "./UserList";

const GameChoosingPage = () => {
  const { eventCode } = useParams();
  const [displayName, setDisplayName] = useState(null);

  useEffect(() => {
  }, [eventCode]);

  const handleDisplayNameSubmit = (name) => {
    setDisplayName(name);
  };

  return (
    <div>
      <h1>What are we playing tonight?</h1>
      {displayName ? (
          <UserList />
      ) : (
        <DisplayNamePrompt onDisplayNameSubmit={handleDisplayNameSubmit} />
      )}
    </div>
  );
};

export default GameChoosingPage;

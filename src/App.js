import React from "react";
import "./App.css";
import GameList from "./components/GameList";
import OverlapFinder from "./components/OverlapFinder";
import EventCreator from "./components/EventCreator";

function App() {
  return (
    <div className="App" style={{ backgroundColor: "black", color: "white" }}>
      <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", padding: "20px" }}>
        <GameList />
        <OverlapFinder />
        <EventCreator />
      </div>
    </div>
  );
}

export default App;

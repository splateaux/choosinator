import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Setup from './components/Setup';
import GameChoosingPage from "./components/GameChoosingPage";

function App() {
  return (
    <Router>
      <div className="App" style={{ backgroundColor: "black", color: "white" }}>
      <Routes>
          <Route path="/" element={<Setup />} />
          <Route path="/:uniqueCode" element={<GameChoosingPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Setup from './components/Setup';
import GameChoosingPage from "./components/GameChoosingPage";
import './globalStyles.css';

function App() {
  return (
    <Router>
      <div className="App" >
      <Routes>
          <Route path="/" element={<Setup />} index />
          <Route path="/:eventCode" element={<GameChoosingPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

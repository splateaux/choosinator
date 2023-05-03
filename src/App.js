import React from "react";
// import { HashRouter as Router, Route, Routes } from "react-router-dom";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Setup from './components/Setup';
import GameChoosingPage from "./components/GameChoosingPage";
import './globalStyles.css';

function App() {
  return (
    <Router>
      {/* <div className="App" style={{ backgroundColor: "black", color: "white" }}> */}
      <div className="App" >
      <Routes>
          <Route path="/" element={<Setup />} index />
          <Route path="/:eventCode" element={<GameChoosingPage />} />
        </Routes>
        {/* <Routes>        
          <Route path="/" element={<Setup />} />
          <Route path="/:eventCode" element={<GameChoosingPage />} />
          <Route path="*" element={<Setup />} />
        </Routes> */}
      </div>
    </Router>
  );
}

export default App;

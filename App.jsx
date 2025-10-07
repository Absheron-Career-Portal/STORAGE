import React, { useState } from "react";
import CareerPanel from "./src/components/CareerPanel";
import ActivityPanel from "./src/components/ActivityPanel";
import "./assets/css/styles.css";

const App = () => {
  const [activeTab, setActiveTab] = useState("career");

  return (
    <div className="admin-panel">
      <h1>Admin Panel</h1>
      <div className="tabs">
        <button
          className={activeTab === "career" ? "active" : ""}
          onClick={() => setActiveTab("career")}
        >
          Career Data
        </button>
        <button
          className={activeTab === "activity" ? "active" : ""}
          onClick={() => setActiveTab("activity")}
        >
          Activity Data
        </button>
      </div>
      {activeTab === "career" ? <CareerPanel /> : <ActivityPanel />}
    </div>
  );
};

export default App;
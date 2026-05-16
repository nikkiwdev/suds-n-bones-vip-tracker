import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import Migrate from "./Migrate.jsx";

const path = window.location.pathname;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {path === "/migrate" ? <Migrate /> : <App />}
  </React.StrictMode>
);

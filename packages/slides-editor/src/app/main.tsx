import React from "react";
import ReactDOM from "react-dom/client";
import "../styles/index.css";
import { Agentation } from "agentation";
import App from "./App";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
    {process.env.NODE_ENV === "development" && <Agentation />}
  </React.StrictMode>
);

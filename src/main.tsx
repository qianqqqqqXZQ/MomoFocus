import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

if (new URLSearchParams(window.location.search).has("floating")) {
  document.documentElement.classList.add("floating-window");
  document.body.classList.add("floating-window");
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

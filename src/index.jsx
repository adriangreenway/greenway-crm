import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { GLOBAL_CSS } from "./tokens";

// Inject global styles
const styleEl = document.createElement("style");
styleEl.textContent = GLOBAL_CSS;
document.head.appendChild(styleEl);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

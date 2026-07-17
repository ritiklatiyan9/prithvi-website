import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { bootstrapAuth } from "./lib/auth";
import "./index.css";

// Exchange the app's one-time ?code= (if present) before first paint so
// auth-only UI never flashes signed-out. Resolves instantly with no code.
void bootstrapAuth().finally(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});

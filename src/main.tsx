import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { bootstrapAuth } from "./lib/auth";
import "./index.css";

// Paint the shell immediately. Embedded auth-only routes already show their
// purposeful "Restoring your session" gate and useAuth updates them in place,
// so blocking first paint on a potentially cold backend only creates a blank
// screen without preventing useful work.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
void bootstrapAuth();

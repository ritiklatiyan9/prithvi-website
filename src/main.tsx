import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { bootstrapAuth } from "./lib/auth";
import { isEmbedded } from "./lib/bridge";
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

// Google AdSense (Auto ads) — normal browsers only. Inside the app's Web Zone
// WebView AdSense is prohibited; the app shows AdMob there instead.
if (!isEmbedded()) {
  const adsense = document.createElement("script");
  adsense.async = true;
  adsense.crossOrigin = "anonymous";
  adsense.src =
    "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2061747225651398";
  document.head.appendChild(adsense);
}

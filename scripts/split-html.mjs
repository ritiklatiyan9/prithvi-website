// After `vite build`: dist/index.html -> web.html (with AdSense) + app.html
// (without). vercel.json serves app.html to Android WebView user agents
// ("; wv)") so AdSense never loads inside the Money Marathon app, and web.html
// to everyone else — including the AdSense crawler, which needs the raw tag.
import { readFileSync, rmSync, writeFileSync } from "node:fs";

const html = readFileSync("dist/index.html", "utf8");
const adsense = /\s*<script async src="https:\/\/pagead2\.googlesyndication\.com\/[^"]*"\s+crossorigin="anonymous"><\/script>/;
if (!adsense.test(html)) throw new Error("AdSense script tag not found in dist/index.html");
const app = html.replace(adsense, "");
if (app.includes("googlesyndication")) throw new Error("app.html still references AdSense");

writeFileSync("dist/web.html", html);
writeFileSync("dist/app.html", app);
rmSync("dist/index.html"); // no index.html, so "/" falls through to the rewrites
console.log("split-html: web.html (AdSense) + app.html (WebView, no AdSense)");

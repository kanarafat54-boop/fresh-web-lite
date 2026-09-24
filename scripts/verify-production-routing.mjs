import fs from "node:fs";

const vercel = JSON.parse(fs.readFileSync("vercel.json", "utf8"));

if (!Array.isArray(vercel.routes)) throw new Error("Vercel routing must use an ordered routes table.");
const routes = vercel.routes;

const apiRoute = routes.find((route) => route.src === "/api/(.*)" && route.dest === "/api/$1");
if (!apiRoute) throw new Error("API routes must be matched before the SPA fallback.");

const filesystemIndex = routes.findIndex((route) => route.handle === "filesystem");
if (filesystemIndex < 0) throw new Error("Vercel routing must allow filesystem/serverless resolution before the SPA fallback.");

const fallbackIndex = routes.findIndex((route) => route.src === "/(.*)" && route.dest === "/index.html");
if (fallbackIndex < 0) throw new Error("SPA fallback to /index.html is required.");
if (filesystemIndex > fallbackIndex) throw new Error("Filesystem resolution must precede the SPA fallback.");
if (routes.indexOf(apiRoute) > filesystemIndex) throw new Error("API routing must precede filesystem/fallback resolution.");

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
if (packageJson.scripts?.build !== "tsc -b && vite build") throw new Error("Production build contract changed unexpectedly.");

console.log("Fresh Web Lite production routing gate: PASS");
console.log("API routes resolve before filesystem/SPA fallback; TypeScript + Vite remains the build contract.");

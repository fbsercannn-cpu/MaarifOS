// Polyfill crypto.randomUUID for non-secure HTTP contexts (mobile device access on local network)
if (typeof globalThis !== "undefined") {
  if (!globalThis.crypto) {
    (globalThis as unknown as { crypto: Record<string, unknown> }).crypto = {};
  }
  if (typeof globalThis.crypto.randomUUID !== "function") {
    globalThis.crypto.randomUUID = function () {
      if (typeof globalThis.crypto.getRandomValues === "function") {
        try {
          return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => {
            const n = Number(c);
            return (
              n ^
              (globalThis.crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (n / 4)))
            ).toString(16);
          }) as `${string}-${string}-${string}-${string}-${string}`;
        } catch {}
      }
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }) as `${string}-${string}-${string}-${string}-${string}`;
    };
  }
}

import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/roboto/latin-500.css";
import App from "./App";
import "./styles.css";
import "./prototype.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

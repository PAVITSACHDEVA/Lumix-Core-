// -------------------------------
// Lumix Core — Secure Backend
// -------------------------------

const express = require("express");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();
app.use(express.json());

// -------------------------------
// HEALTH CHECK ENDPOINT
// -------------------------------
app.get("/health", (req, res) => {
  res.status(200).json({ ok: true, service: "Lumix Core Backend" });
});

// -------------------------------
// ROTATING KEY SYSTEM
// Add multiple keys in Render like:
// KEY_1 = ...
// KEY_2 = ...
// KEY_3 = ...
// -------------------------------
const KEYS = [
  process.env.KEY_1,
  process.env.KEY_2,
  process.env.KEY_3
].filter(Boolean);

let keyIndex = 0;

function getAPIKey() {
  if (KEYS.length === 0) return null;
  const key = KEYS[keyIndex];
  keyIndex = (keyIndex + 1) % KEYS.length;
  return key;
}

// -------------------------------
// Gemini 2.5 Flash Model
// -------------------------------
const MODEL = "models/gemini-2.5-flash";

// -------------------------------
// MAIN AI ENDPOINT
// -------------------------------
app.post("/api/gemini", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Missing prompt." });

    const apiKey = getAPIKey();
    if (!apiKey) {
      return res.status(500).json({ error: "No API keys active." });
    }

    const url =
      `https://generativelanguage.googleapis.com/v1beta/${MODEL}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: message }]
          }
        ]
      })
    });

    const data = await response.json();

    // -------------------------------
    // STRONG ERROR HANDLING
    // -------------------------------
    if (!response.ok) {
      return res.status(500).json({
        error: true,
        code: data.error?.status,
        message: data.error?.message || "Gemini error",
        raw: data
      });
    }

    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No AI response.";

    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: true, details: err.message });
  }
});

// -------------------------------
// START SERVER
// -------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Lumix Core Backend Running on Port ${PORT}`)
);

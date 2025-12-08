const express = require("express");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();
app.use(express.json());

// ✅ HEALTH CHECK ENDPOINT
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "Lumix Core Backend"
  });
});

// Gemini model
const GEMINI_MODEL = "models/gemini-2.5-flash";

app.post("/api/gemini", async (req, res) => {
  try {
    const { message } = req.body;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: message }]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error: true,
        details: data
      });
    }

    const output =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response from Gemini.";

    res.json({ reply: output });
  } catch (err) {
    res.status(500).json({ error: true, details: err.message });
  }
});

// ✅ START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Lumix Core backend running on port", PORT));

/* ---------------------------------------------------------
   LUMIX CORE AI — MAIN SCRIPT (Moved out of HTML)
   All AI features, chat engine, Gemini API, Weather, Voice,
   Summaries, Quiz Generator, Context Suggestions, etc.
   --------------------------------------------------------- */


/* ---------------------------------------------------------
   GEMINI API — OBFUSCATED KEY
--------------------------------------------------------- */
const GEMINI_SALT = "LumixCore2025";

const GEMINI_KEY_CHUNKS = [
  "tpAGNhOz0OL",
  "WfFp/fXxFL",
  "B9BdAUbVg",
  "W4YBhd5HVle",
  "DTwXCCs6Kzh"
];

const GEMINI_KEY_ORDER = [4, 1, 2, 0, 3];

function decodeGeminiKey() {
  const base64 = GEMINI_KEY_ORDER.map(i => GEMINI_KEY_CHUNKS[i]).join("");
  const obf = atob(base64);
  let out = "";
  for (let i = 0; i < obf.length; i++) {
    out += String.fromCharCode(
      obf.charCodeAt(i) ^ GEMINI_SALT.charCodeAt(i % GEMINI_SALT.length)
    );
  }
  return out;
}

const GEMINI_API_KEYS = [decodeGeminiKey()];
const GEMINI_API_KEY = GEMINI_API_KEYS[0];


/* ---------------------------------------------------------
   API PROVIDERS
--------------------------------------------------------- */
const API_PROVIDERS = [
  { name: "gemini", key: GEMINI_API_KEY, enabled: true }
];

const WEATHER_API_KEY = "86af92bb29ea4c278df101649250409";


/* ---------------------------------------------------------
   DOM ELEMENTS
--------------------------------------------------------- */
const input = document.querySelector('[data-testid="chat-input"]');
const sendButton = document.querySelector('[data-testid="send-button"]');
const chatContainer = document.querySelector('[data-testid="chat-container"]');
const micButton = document.querySelector('[data-testid="mic-button"]');
const summaryShortButton = document.querySelector('[data-testid="summary-short"]');
const summaryLongButton = document.querySelector('[data-testid="summary-long"]');
const locButton = document.querySelector('[data-testid="loc-button"]');
const quizGeneratorButton = document.getElementById('quiz-generator');
const avatarPanelToggle = document.getElementById('avatar-panel-toggle');

const contextSuggestionsContainer = document.getElementById("context-suggestions");
const tooltip = document.getElementById("tooltip");

const voiceToggle = document.getElementById("voice-toggle");

const CREATOR_NAME = "Pavit";
const AI = "Lumix Core";

let chatHistory = [];


/* ---------------------------------------------------------
   BASIC HELPERS
--------------------------------------------------------- */
function scrollToBottom() {
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function createMessage(content, sender = 'ai', isMarkdown = false) {
  const msg = document.createElement("div");
  msg.className = `message ${sender} mb-4`;

  const timestamp = new Date().toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit"
  });

  const markedHTML = marked.parse(content);
  const formatted =
    content.length > 600
      ? `<details class='markdown-body'><summary>Click to expand</summary>${markedHTML}</details>`
      : `<div class='markdown-body'>${markedHTML}</div>`;

  msg.innerHTML = `
    <div class="font-bold mb-1">${sender === "ai" ? AI : "You"}</div>
    <div class="message-content">${isMarkdown ? formatted : content}</div>
    <div class="timestamp">${timestamp}</div>
  `;

  chatContainer.appendChild(msg);
  scrollToBottom();

  if (window.renderMathInElement) {
    renderMathInElement(msg, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false }
      ]
    });
  }
}

/* Typing Indicator */
function showTyping() {
  hideTyping();
  const typing = document.createElement("div");
  typing.className = "message ai";
  typing.dataset.testid = "typing-indicator";
  typing.innerHTML = `
      <div class="font-bold mb-1">${AI}</div>
      <div class="message-content">
          <div class="typing-indicator">
              <div class="animated-cursor"></div> Typing...
          </div>
      </div>
  `;
  chatContainer.appendChild(typing);
  scrollToBottom();
}

function hideTyping() {
  const t = document.querySelector('[data-testid="typing-indicator"]');
  if (t) t.remove();
}


/* ---------------------------------------------------------
   GEMINI API CALL
--------------------------------------------------------- */
async function callGeminiAPI(content, systemPrompt = "You are a helpful assistant.") {
  const models = ["gemini-1.5-flash", "gemini-1.5-pro"];

  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: `${systemPrompt}\n\n${content}` }]
      }
    ]
  };

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );

      const json = await res.json();
      if (!res.ok) continue;

      const text =
        json?.candidates?.[0]?.content?.parts?.[0]?.text || "No output available.";

      return { text };
    } catch (e) {
      console.error("Gemini error:", e);
    }
  }

  throw new Error("Gemini API failed.");
}


/* ---------------------------------------------------------
   WEATHER SYSTEM
--------------------------------------------------------- */
async function getWeatherData(city) {
  if (!WEATHER_API_KEY) return null;

  try {
    const res = await fetch(
      `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${city}&aqi=no`
    );
    if (!res.ok) return null;

    const w = await res.json();

    return {
      city: w.location.name,
      country: w.location.country,
      temperature: w.current.temp_c,
      humidity: w.current.humidity,
      wind: w.current.wind_kph,
      feelsLike: w.current.feelslike_c,
      description: w.current.condition.text
    };
  } catch {
    return null;
  }
}

async function getUserLocationByPermission() {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${latitude},${longitude}`
          );
          const data = await res.json();
          resolve(data.location?.name || null);
        } catch {
          resolve(null);
        }
      },
      () => resolve(null)
    );
  });
}


/* ---------------------------------------------------------
   VOICE OUTPUT
--------------------------------------------------------- */
function speak(text) {
  if (!voiceToggle || !voiceToggle.checked) return;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1;
  u.pitch = 1;
  speechSynthesis.speak(u);
}


/* ---------------------------------------------------------
   HANDLE USER QUERY
--------------------------------------------------------- */
async function handleUserQuery(query) {
  let reply = "";
  const lower = query.toLowerCase();

  // Identity-related Q&A
  if (/who (made|created|developed) you/.test(lower)) {
    reply = `I was created by ${CREATOR_NAME}, the brilliant mind behind this assistant.`;
    return reply;
  }

  if (/what('?s| is) your name/.test(lower)) {
    return "My name is Lumix Core.";
  }

  if (/who are you/.test(lower)) {
    return `I'm ${AI}, your intelligent assistant designed by ${CREATOR_NAME}.`;
  }

  if (/name mean/.test(lower)) {
    return `"LumixCore" represents clarity, intelligence, and the beating heart of this AI system.`;
  }

  // Weather
  if (/weather|temperature|forecast|rain|snow|wind|humid/.test(lower)) {
    let cityMatch =
      query.match(/weather.*?(?:in|for)\s+([A-Za-z\s]+)/i) ||
      query.match(/([A-Za-z\s]+?)\s+weather/i);

    let city = cityMatch ? cityMatch[1].trim() : await getUserLocationByPermission();
    if (!city) city = "Mumbai";

    const w = await getWeatherData(city);
    if (!w) return `Unable to fetch weather for ${city}.`;

    return `
**Weather in ${w.city}, ${w.country}:**
🌡️ Temperature: ${w.temperature}°C  
💧 Humidity: ${w.humidity}%  
💨 Wind: ${w.wind} km/h  
😌 Feels Like: ${w.feelsLike}°C  
☁️ Condition: ${w.description}
    `;
  }

  // Coding/context detection
  const context = lower.includes("code") ? "coding" : "general";

  // Call AI
  const result = await callGeminiAPI(query);
  reply = result.text;

  updateContextSuggestions(context, reply);
  return reply;
}


/* ---------------------------------------------------------
   SEND MESSAGE
--------------------------------------------------------- */
async function sendMessage() {
  const q = input.value.trim();
  if (!q) return;

  createMessage(q, "user");
  input.value = "";

  chatHistory.push({ role: "user", parts: [{ text: q }] });

  showTyping();

  try {
    const ans = await handleUserQuery(q);
    hideTyping();
    createMessage(ans, "ai", true);

    speak(ans);

    chatHistory.push({ role: "model", parts: [{ text: ans }] });
  } catch (e) {
    hideTyping();
    createMessage(`❌ ${e.message}`, "ai");
  }

  scrollToBottom();
}


/* ---------------------------------------------------------
   SUMMARIZATION
--------------------------------------------------------- */
async function summarize(lines = 10) {
  const last = chatHistory.filter(m => m.role === "model").pop();
  if (!last) return createMessage("Nothing to summarize yet.", "ai");

  const prompt = `
Summarize the following text into **${lines} lines**. Use bullet points and highlight important terms:

${last.parts[0].text}
`;

  const res = await callGeminiAPI(prompt);
  createMessage(res.text, "ai", true);
  speak(res.text);
}


/* ---------------------------------------------------------
   QUIZ GENERATOR
--------------------------------------------------------- */
async function generateQuiz() {
  const last = chatHistory.filter(m => m.role === "model").pop();
  if (!last) return createMessage("No content to create a quiz from.", "ai");

  const prompt = `
You are a quiz generator. Create **3 multiple-choice questions** based on this text:

${last.parts[0].text}

Provide:
- 4 options per question  
- The correct answer clearly labeled
  `;

  const res = await callGeminiAPI(prompt);
  createMessage(res.text, "ai", true);
}


/* ---------------------------------------------------------
   CONTEXT-AWARE SUGGESTIONS
--------------------------------------------------------- */
function updateContextSuggestions(context, reply) {
  contextSuggestionsContainer.innerHTML = "";

  let suggestions = [];

  if (context === "coding") {
    suggestions = [
      "Explain this code",
      "Optimize this code",
      "Add comments to this code"
    ];
  } else if (reply.length > 300) {
    suggestions = [
      "Explain this like I'm five",
      "Give me 3 key takeaways",
      "Translate this to Spanish"
    ];
  }

  suggestions.forEach(text => {
    const btn = document.createElement("button");
    btn.className = "suggestion-btn";
    btn.textContent = text;
    btn.onclick = () => {
      input.value = text;
      sendMessage();
    };
    contextSuggestionsContainer.appendChild(btn);
  });
}


/* ---------------------------------------------------------
   EVENT LISTENERS
--------------------------------------------------------- */
sendButton.addEventListener("click", sendMessage);
input.addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});

summaryShortButton.addEventListener("click", () => summarize(7));
summaryLongButton.addEventListener("click", () => summarize(15));

quizGeneratorButton.addEventListener("click", generateQuiz);

/* Microphone */
if ("webkitSpeechRecognition" in window) {
  const rec = new webkitSpeechRecognition();
  rec.lang = "en-US";
  rec.continuous = false;
  rec.interimResults = false;

  micButton.addEventListener("click", () => rec.start());

  rec.onresult = e => {
    input.value = e.results[0][0].transcript;
    sendMessage();
  };
}

/* Location Button */
locButton.addEventListener("click", async () => {
  createMessage("Fetching your location…", "ai");
  const city = await getUserLocationByPermission();
  if (city) {
    createMessage(`📍 Using your location: ${city}`, "ai");
  } else {
    createMessage("Could not get location. Using Mumbai.", "ai");
  }
});

/* Avatar Panel Toggle */
avatarPanelToggle.addEventListener("click", () => {
  document.body.classList.toggle("panel-open");
});

/* Tooltip Hover */
document.querySelectorAll(".explain-btn").forEach(btn => {
  btn.addEventListener("mouseover", e => {
    tooltip.textContent = btn.dataset.tooltip;
    tooltip.style.opacity = "1";
    tooltip.style.left = `${e.clientX + 10}px`;
    tooltip.style.top = `${e.clientY + 10}px`;
  });
  btn.addEventListener("mouseout", () => (tooltip.style.opacity = "0"));
});


/* ---------------------------------------------------------
   INTRO MESSAGE
--------------------------------------------------------- */
createMessage("Hello! I'm Lumix Core — your upgraded AI assistant. How can I help you today?", "ai", true);

scrollToBottom();


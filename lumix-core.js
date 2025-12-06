/**************************************************
 *  LUMIX CORE – FIXED, CLEAN, WORKING JS FILE
 **************************************************/

/* ---------- GLOBAL CONSTANTS ---------- */
const AI_NAME = "Lumix Core";
const CREATOR_NAME = "Pavit";

/* Escape HTML safely */
function escapeHtml(text = "") {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ---------- GEMINI API CONFIG ---------- */
const GEMINI_API_KEYS = [
  "AIzaSyDJ3NjMH00Av97ji39Y2V-NPgU-wtrK-kk",
  "AIzaSyCnnZ-2TwJbRoMemqfrnicWIy3BbS67zjI",
  "AIzaSyD73fVeCDIhSYZxmH6elyGjmenTCwYzGnc"
];

function getRandomKey() {
  return GEMINI_API_KEYS[Math.floor(Math.random() * GEMINI_API_KEYS.length)];
}

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
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${getRandomKey()}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await res.json();

      if (!res.ok) {
        console.warn("Gemini model failed:", model, json.error?.message);
        continue;
      }

      return {
        text:
          json?.candidates?.[0]?.content?.parts?.[0]?.text ||
          "⚠️ No response received."
      };
    } catch (err) {
      console.error("Gemini error:", model, err);
    }
  }

  throw new Error("Gemini API failed. All models unavailable.");
}

async function callGenerativeAPI(q, sys) {
  return callGeminiAPI(q, sys);
}

/* ---------- WEATHER API ---------- */
const WEATHER_API_KEY = "86af92bb29ea4c278df101649250409";

async function getWeatherData(city) {
  try {
    const res = await fetch(
      `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(city)}&aqi=no`
    );

    const w = await res.json();
    if (!res.ok) return null;

    return {
      city: w.location.name,
      country: w.location.country,
      temperature: Math.round(w.current.temp_c),
      description: w.current.condition.text,
      humidity: w.current.humidity,
      windSpeed: Math.round((w.current.wind_kph / 3.6) * 10) / 10,
      feelsLike: Math.round(w.current.feelslike_c)
    };
  } catch (e) {
    console.error("Weather error:", e);
    return null;
  }
}

/* ---------- GEOLOCATION ---------- */
async function getUserLocationByPermission() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${coords.latitude},${coords.longitude}`
          );
          const data = await res.json();
          resolve(data.location?.name || null);
        } catch {
          resolve(null);
        }
      },
      () => resolve(null),
      { timeout: 7000 }
    );
  });
}

/* ---------- MAIN APP ---------- */
document.addEventListener("DOMContentLoaded", () => {
  /* Elements */
  const input = document.querySelector('[data-testid="chat-input"]');
  const sendButton = document.querySelector('[data-testid="send-button"]');
  const chatContainer = document.querySelector('[data-testid="chat-container"]');
  const summaryShort = document.querySelector('[data-testid="summary-short"]');
  const summaryLong = document.querySelector('[data-testid="summary-long"]');
  const locButton = document.querySelector('[data-testid="loc-button"]');
  const micButton = document.querySelector('[data-testid="mic-button"]');
  const quizButton = document.getElementById("quiz-generator");
  const historyPanel = document.getElementById("chat-history-log");
  const contextSuggestions = document.getElementById("context-suggestions");
  const avatarToggle = document.getElementById("avatar-panel-toggle");
  const tooltip = document.getElementById("tooltip");
  const voiceToggle = document.getElementById("voice-toggle");

  let chatHistory = [];
  let voiceEnabled = false;

  /* ---------- SCROLL HANDLER ---------- */
  function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  /* ---------- MESSAGE RENDERING ---------- */
  function createMessage(content, sender = "ai", isMarkdown = false) {
    const msg = document.createElement("div");
    msg.className = `message ${sender}`;

    const timestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });

    const html = isMarkdown ? marked.parse(content) : escapeHtml(content);

    msg.innerHTML = `
      <div class="font-bold">${sender === "ai" ? AI_NAME : "You"}</div>
      <div class="message-content">${html}</div>
      <div class="timestamp">${timestamp}</div>
    `;

    chatContainer.appendChild(msg);
    scrollToBottom();
  }

  /* ---------- TYPING INDICATOR ---------- */
  function showTyping() {
    const t = document.createElement("div");
    t.dataset.testid = "typing";
    t.className = "message ai";
    t.innerHTML = `
      <div class="font-bold">${AI_NAME}</div>
      <div class="message-content typing-indicator">Typing...</div>
    `;
    chatContainer.appendChild(t);
    scrollToBottom();
  }

  function hideTyping() {
    const t = document.querySelector("[data-testid='typing']");
    if (t) t.remove();
  }

  /* ---------- VOICE OUTPUT ---------- */
  voiceToggle?.addEventListener("change", (e) => {
    voiceEnabled = e.target.checked;
  });

  function speak(text) {
    if (!voiceEnabled) return;
    const u = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(u);
  }

  /* ---------- HISTORY PANEL ---------- */
  function updateHistory() {
    if (!historyPanel) return;

    historyPanel.innerHTML = chatHistory
      .slice(-6)
      .map(
        (m) =>
          `<p><b>${m.role === "user" ? "You" : AI_NAME}:</b> ${escapeHtml(
            m.parts[0].text.slice(0, 80)
          )}...</p>`
      )
      .join("");
  }

  /* ---------- HANDLE USER QUERY ---------- */
  async function handleUserQuery(q) {
    const lower = q.toLowerCase();

    if (lower.includes("your name")) return `I'm ${AI_NAME}.`;
    if (lower.includes("creator")) return `I was built by ${CREATOR_NAME}.`;

    const isWeather = /weather|temperature|climate/i.test(lower);
    if (isWeather) {
      let city = q.match(/in ([a-zA-Z ]+)$/i)?.[1];
      if (!city) city = await getUserLocationByPermission();
      if (!city) city = "Mumbai";

      const w = await getWeatherData(city);
      if (!w) return "❌ Unable to fetch weather.";

      return `
**Weather in ${w.city}, ${w.country}:**  
🌡️ ${w.temperature}°C (Feels like ${w.feelsLike}°C)  
💧 Humidity: ${w.humidity}%  
💨 Wind: ${w.windSpeed} m/s  
☁️ ${w.description}
      `;
    }

    const result = await callGenerativeAPI(q, "You are a helpful assistant.");
    return result.text;
  }

  /* ---------- SEND USER MESSAGE ---------- */
  async function sendMessage() {
    const q = input.value.trim();
    if (!q) return;

    createMessage(q, "user");
    chatHistory.push({ role: "user", parts: [{ text: q }] });
    input.value = "";

    updateHistory();
    showTyping();

    try {
      const r = await handleUserQuery(q);
      hideTyping();
      createMessage(r, "ai", true);
      chatHistory.push({ role: "model", parts: [{ text: r }] });
      updateHistory();
      speak(r);
    } catch (e) {
      hideTyping();
      createMessage("❌ " + e.message);
    }
  }

  /* ---------- SHORT SUMMARY ---------- */
  summaryShort.addEventListener("click", () => {
    const last = chatHistory.filter((m) => m.role === "model").pop();
    if (!last) return createMessage("No message to summarize.");
    sendMessageFromSystem(
      `Summarize in 5–10 bullet points:\n\n${last.parts[0].text}`,
      "Summarizing..."
    );
  });

  /* ---------- LONG SUMMARY ---------- */
  summaryLong.addEventListener("click", () => {
    const last = chatHistory.filter((m) => m.role === "model").pop();
    if (!last) return createMessage("No message to summarize.");
    sendMessageFromSystem(
      `Summarize in 10–15 bullet points:\n\n${last.parts[0].text}`,
      "Detailed summary requested..."
    );
  });

  /* ---------- SYSTEM QUERY ---------- */
  async function sendMessageFromSystem(prompt, display) {
    createMessage(display, "user");
    showTyping();
    try {
      const r = await callGenerativeAPI(prompt);
      hideTyping();
      createMessage(r.text, "ai", true);
    } catch (e) {
      hideTyping();
      createMessage("❌ " + e.message);
    }
  }

  /* ---------- QUIZ ---------- */
  quizButton.addEventListener("click", () => {
    const last = chatHistory.filter((m) => m.role === "model").pop();
    if (!last) return createMessage("No content to create quiz.");
    sendMessageFromSystem(
      `Create a 3-question MCQ quiz based on this:\n\n${last.parts[0].text}`,
      "Generating quiz..."
    );
  });

  /* ---------- LOCATION WEATHER BUTTON ---------- */
  locButton.addEventListener("click", async () => {
    createMessage("Checking your location...");
    const city = await getUserLocationByPermission();
    if (!city) return createMessage("Couldn't access location.");
    const weather = await getWeatherData(city);
    createMessage(JSON.stringify(weather, null, 2), "ai", true);
  });

  /* ---------- MICROPHONE INPUT ---------- */
  if ("webkitSpeechRecognition" in window) {
    const recog = new webkitSpeechRecognition();
    recog.lang = "en-US";
    recog.onresult = (e) => {
      input.value = e.results[0][0].transcript;
      sendMessage();
    };
    micButton.addEventListener("click", () => recog.start());
  } else micButton.style.display = "none";

  /* ---------- AVATAR PANEL ---------- */
  avatarToggle.addEventListener("click", () => {
    document.body.classList.toggle("panel-open");
  });

  /* ---------- TOOLTIP ---------- */
  document.querySelectorAll(".explain-btn").forEach((btn) => {
    btn.addEventListener("mouseenter", (e) => {
      tooltip.textContent = btn.dataset.tooltip;
      tooltip.style.opacity = 1;
      tooltip.style.left = e.clientX + 20 + "px";
      tooltip.style.top = e.clientY + 20 + "px";
    });
    btn.addEventListener("mouseleave", () => {
      tooltip.style.opacity = 0;
    });
  });

  /* ---------- NAVIGATION SOUND ---------- */
  document.querySelectorAll(".gradient-text").forEach((link) => {
    link.addEventListener("click", (e) => {
      const sound = document.getElementById(link.dataset.soundId);
      if (!sound) return;
      e.preventDefault();
      sound.currentTime = 0;
      sound.play();
      sound.onended = () => (window.location.href = link.href);
    });
  });

  /* ---------- INITIAL GREETING ---------- */
  createMessage(
    "Hello! I'm your assistant, now with enhanced features — light/dark theme, voice, summaries, quizzes, and more. Ask me anything!",
    "ai",
    true
  );
});

const AI_NAME = "Lumix Core";

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

// ---------- Gemini API ----------


const GEMINI_API_KEYS = [
  "AIzaSyDJ3NjMH00Av97ji39Y2V-NPgU-wtrK-kk",
  "AIzaSyCnnZ-2TwJbRoMemqfrnicWIy3BbS67zjI",
  "AIzaSyD73fVeCDIhSYZxmH6elyGjmenTCwYzGnc"
];

const GEMINI_API_KEY =
  GEMINI_API_KEYS[Math.floor(Math.random() * GEMINI_API_KEYS.length)];
async function callGeminiAPI(content, systemPrompt = "You are a helpful assistant.") {
    const models = [
        "gemini-1.5-flash",
        "gemini-1.5-pro"
    ];

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
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const json = await res.json();
            if (!res.ok) continue;

            return {
                text:
                    json?.candidates?.[0]?.content?.parts?.[0]?.text ||
                    ""
            };

        } catch (err) {
            console.log("Gemini model failed:", model, err);
        }
    }

    throw new Error("Gemini API failed. All models unavailable.");
}

// keep using callGenerativeAPI as before:
async function callGenerativeAPI(content, systemPrompt = "You are a helpful assistant.") {
  return callGeminiAPI(content, systemPrompt);
}


// ------------- WEATHER -------------

async function getWeatherData(city) {
  if (!WEATHER_API_KEY) return "NO_API_KEYS";
  try {
    const res = await fetch(
      `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(
        city
      )}&aqi=no`
    );
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) return "API_KEY_INVALID";
      if (res.status === 400) return "CITY_NOT_FOUND";
      return null;
    }
    const w = await res.json();
    return {
      city: w.location.name,
      country: w.location.country,
      temperature: Math.round(w.current.temp_c),
      description: w.current.condition.text,
      humidity: w.current.humidity,
      windSpeed: Math.round((w.current.wind_kph / 3.6) * 10) / 10,
      feelsLike: Math.round(w.current.feelslike_c),
      source: "WeatherAPI",
    };
  } catch (e) {
    console.error("Weather error", e);
    return null;
  }
}

async function getUserLocationByPermission() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          const res = await fetch(
            `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${latitude},${longitude}&aqi=no`
          );
          const data = await res.json();
          resolve(data.location?.name || null);
        } catch (e) {
          console.error("Geo weather error", e);
          resolve(null);
        }
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  });
}

// ------------- MAIN APP SETUP -------------

document.addEventListener("DOMContentLoaded", () => {
  // DOM refs
  const input = document.querySelector('[data-testid="chat-input"]');
  const sendButton = document.querySelector('[data-testid="send-button"]');
  const chatContainer = document.querySelector(
    '[data-testid="chat-container"]'
  );
  const micButton = document.querySelector('[data-testid="mic-button"]');
  const summaryShortButton = document.querySelector(
    '[data-testid="summary-short"]'
  );
  const summaryLongButton = document.querySelector(
    '[data-testid="summary-long"]'
  );
  const locButton = document.querySelector('[data-testid="loc-button"]');
  const avatarPanelToggle = document.getElementById("avatar-panel-toggle");
  const quizGeneratorButton = document.getElementById("quiz-generator");
  const contextSuggestionsContainer = document.getElementById(
    "context-suggestions"
  );
  const tooltip = document.getElementById("tooltip");
  const themeToggleLoading = document.getElementById("themeToggleLoading");
  const themeToggleHeader = document.getElementById("themeToggleHeader");
  const links = document.querySelectorAll(".gradient-text");
  const chatHistoryLog = document.getElementById("chat-history-log");
  const voiceToggle = document.getElementById("voice-toggle");
  const loadingEl = document.getElementById("loading");
  const loadingTextEl = document.getElementById("loadingText");
  const loaderFillEl = document.getElementById("loaderFill");

  let chatHistory = [];
  let cachedCity = null;
  let voiceEnabled = false;

  // ---------- LOADER ANIMATION ----------
  (function initLoader() {
    const phrases = [
      "Booting Lumix Core…",
      "Calibrating neural pathways…",
      "Styling the UI pixels…",
      "Connecting to the Gemini engine…",
      "Almost ready!",
    ];
    let idx = 0;
    loadingTextEl.textContent = phrases[0];

    setInterval(() => {
      idx = (idx + 1) % phrases.length;
      loadingTextEl.textContent = phrases[idx];
    }, 2200);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 10 + Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setTimeout(hideLoader, 500);
      }
      loaderFillEl.style.width = `${progress}%`;
    }, 400);
  })();

  function hideLoader() {
    if (!loadingEl) return;
    loadingEl.style.opacity = "0";
    setTimeout(() => {
      loadingEl.style.display = "none";
    }, 900);
  }

  // ---------- THEME TOGGLE (LIGHT / DARK) ----------

  function updateThemeUI() {
    const light = document.body.classList.contains("light-mode");
    document.querySelectorAll(".theme-icon").forEach((icon) => {
      icon.className = light
        ? "theme-icon bi bi-moon-fill"
        : "theme-icon bi bi-brightness-high";
    });
    document.querySelectorAll(".theme-label").forEach((label) => {
      label.textContent = light ? "Dark Mode" : "Light Mode";
    });
  }

  function toggleTheme() {
    document.body.classList.toggle("light-mode");
    updateThemeUI();
  }

  if (themeToggleLoading)
    themeToggleLoading.addEventListener("click", toggleTheme);
  if (themeToggleHeader)
    themeToggleHeader.addEventListener("click", toggleTheme);
  updateThemeUI();

  // ---------- MESSAGE RENDERING ----------

  function createMessage(content, sender = "ai", isMarkdown = false) {
    const msg = document.createElement("div");
    msg.className = `message ${sender} mb-4`;

    const timestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const isLong = content.length > 600;
    const mdHTML = marked.parse(content);
    const wrapped = isLong
      ? `<details class="markdown-body"><summary class="cursor-pointer text-blue-400 underline">Click to expand</summary>${mdHTML}</details>`
      : `<div class="markdown-body">${mdHTML}</div>`;

    const safeText = escapeHtml(content);

    const finalContent = isMarkdown ? wrapped : safeText;

    msg.innerHTML = `
      <div class="font-bold mb-1">${sender === "ai" ? AI_NAME : "You"}</div>
      <div class="message-content">${finalContent}</div>
      <div class="text-xs opacity-60 mt-1">${timestamp}</div>
    `;

    chatContainer.appendChild(msg);

    if (window.renderMathInElement) {
      renderMathInElement(msg, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
        ],
      });
    }
    scrollToBottom(chatContainer);
  }

  function showTyping() {
    const typing = document.createElement("div");
    typing.className = "message ai";
    typing.dataset.testid = "typing-indicator";
    typing.innerHTML = `
      <div class="font-bold mb-1">${AI_NAME}</div>
      <div class="message-content">
        <div class="typing-indicator">
          <div class="animated-cursor"></div> Typing...
        </div>
      </div>
    `;
    chatContainer.appendChild(typing);
    scrollToBottom(chatContainer);
  }

  function hideTyping() {
    const indicator = document.querySelector(
      '[data-testid="typing-indicator"]'
    );
    if (indicator) indicator.remove();
  }

  // ---------- SIDE PANEL HISTORY ----------

  function refreshHistoryPanel() {
    if (!chatHistoryLog) return;
    const lastItems = chatHistory.slice(-6);
    if (!lastItems.length) {
      chatHistoryLog.innerHTML =
        "<p>Your conversation history will appear here.</p>";
      return;
    }

    chatHistoryLog.innerHTML = lastItems
      .map((m) => {
        const who = m.role === "user" ? "You" : AI_NAME;
        const text = escapeHtml(m.parts[0]?.text || "").slice(0, 120);
        return `<p><strong>${who}:</strong> ${text}${
          text.length === 120 ? "…" : ""
        }</p>`;
      })
      .join("");
  }

  // ---------- VOICE OUTPUT ----------

  voiceToggle?.addEventListener("change", (e) => {
    voiceEnabled = e.target.checked;
  });

  function speakText(text) {
    if (!voiceEnabled) return;
    if (!("speechSynthesis" in window)) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  // ---------- HANDLE USER QUERY ----------

  async function handleUserQuery(query) {
    let reply = "";
    const lower = query.toLowerCase();
    let queryContext = "general";

    // Personality shortcuts
    if (/who (made|created|developed) you/i.test(lower)) {
      const replies = [
        `I was created by ${CREATOR_NAME}, the mind behind this assistant.`,
        `I was handcrafted by ${CREATOR_NAME} — designer, developer, and all-around genius.`,
        `Call me your digital sidekick — created by ${CREATOR_NAME} with vision and code.`,
      ];
      return replies[Math.floor(Math.random() * replies.length)];
    }

    if (/what('?s| is) your name/i.test(lower)) {
      return `My name is '${AI_NAME}'.`;
    }

    if (/who are you/i.test(lower)) {
      return `I'm your AI assistant, powered by Gemini and crafted by ${CREATOR_NAME}.`;
    }

    if (/what does your name mean/i.test(lower)) {
      return `"LumixCore" is the smart center of your assistant—a blend of bright design and clear reasoning. It’s more than a UI; it’s the base, the brain, and the heart of your AI.`;
    }

    if (
      /give a (tagline|good tagline) for your (name|name lumixcore)?/i.test(
        lower
      )
    ) {
      const replies = [
        "“LumixCore: The brilliance behind every reply.”",
        "“Powered by clarity. Driven by logic.”",
        "“LumixCore — where design meets depth.”",
        `“Your assistant’s soul, styled by ${CREATOR_NAME}.”`,
      ];
      return replies[Math.floor(Math.random() * replies.length)];
    }

    // Weather query?
    const isWeatherQuery =
      /weather|temperature|forecast|climate|humid|rain|snow|wind|sunny|cloudy/i.test(
        lower
      );
    if (isWeatherQuery) {
      queryContext = "weather";

      const cityMatch =
        query.match(
          /weather.*?(?:in|for|at)\s+([a-zA-Z\s]+?)(?:\s|$|\?|\.)/i
        ) || query.match(/([a-zA-Z\s]+?)\s+weather/i);

      let city = cityMatch ? cityMatch[1].trim() : null;
      if (!city) city = await getUserLocationByPermission();

      let defaulted = false;
      if (!city) {
        city = "Mumbai";
        defaulted = true;
      }

      const weatherData = await getWeatherData(city);
      if (weatherData && typeof weatherData === "object") {
        const preface = defaulted
          ? "📍 Couldn't access your location. Using Mumbai by default.\n\n"
          : "";
        reply =
          `${preface}**Current Weather in ${weatherData.city}, ${weatherData.country}:**\n\n` +
          `🌡️ **Temperature:** ${weatherData.temperature}°C (feels like ${weatherData.feelsLike}°C)  \n` +
          `☁️ **Condition:** ${
            weatherData.description.charAt(0).toUpperCase() +
            weatherData.description.slice(1)
          }  \n` +
          `💧 **Humidity:** ${weatherData.humidity}%  \n` +
          `💨 **Wind Speed:** ${weatherData.windSpeed} m/s`;
      } else {
        reply = `❌ Unable to fetch weather for "${city}". Try again later.`;
      }

      updateContextSuggestions(queryContext, reply);
      return reply;
    }

    // Coding queries: flag context
    if (
      lower.includes("code") ||
      lower.includes("javascript") ||
      lower.includes("python")
    ) {
      queryContext = "coding";
    }

    const result = await callGenerativeAPI(
      query,
      "You are a helpful assistant."
    );
    reply = result.text;
    updateContextSuggestions(queryContext, reply);
    return reply;
  }

  // ---------- CONTEXT SUGGESTIONS ----------

  function updateContextSuggestions(context, reply) {
    contextSuggestionsContainer.innerHTML = "";
    let suggestions = [];

    if (context === "weather") {
      suggestions = [
        "What should I wear?",
        "Is it a good day for a walk?",
        "How does this compare to yesterday?",
      ];
    } else if (context === "coding") {
      suggestions = [
        "Can you explain this code?",
        "How can I optimize this?",
        "Add comments to the code.",
      ];
    } else if (reply.length > 300) {
      suggestions = [
        "Explain this like I'm five. (from our previous conversation)",
        "Give me 3 key takeaways. (from our previous conversation)",
        "Translate this to Spanish. (from our previous conversation)",
      ];
    }

    suggestions.forEach((text) => {
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

  // ---------- SENDING / SYSTEM QUERIES ----------

  async function sendMessage() {
    const q = input.value.trim();
    if (!q) return;
    createMessage(q, "user");
    input.value = "";
    chatHistory.push({ role: "user", parts: [{ text: q }] });
    refreshHistoryPanel();

    showTyping();
    sendButton.disabled = true;

    try {
      const r = await handleUserQuery(q);
      hideTyping();
      createMessage(r, "ai", true);
      chatHistory.push({ role: "model", parts: [{ text: r }] });
      refreshHistoryPanel();
      speakText(r);
    } catch (e) {
      hideTyping();
      createMessage(`❌ ${e.message}`, "ai", false);
    } finally {
      sendButton.disabled = false;
    }
  }

  async function sendSystemQuery(query, systemPrompt, userMessage) {
    createMessage(userMessage || query, "user");
    showTyping();
    try {
      const r = await callGenerativeAPI(query, systemPrompt);
      hideTyping();
      createMessage(r.text, "ai", true);
      chatHistory.push({ role: "user", parts: [{ text: query }] });
      chatHistory.push({ role: "model", parts: [{ text: r.text }] });
      refreshHistoryPanel();
      speakText(r.text);
    } catch (e) {
      hideTyping();
      createMessage(`❌ ${e.message}`, "ai", false);
    }
  }

  // ---------- SUMMARIZATION ----------

  async function summarizeConversation(lines = 10) {
    const last = chatHistory.filter((m) => m.role === "model").pop();
    if (!last) {
      createMessage("There's nothing to summarize yet.", "ai", true);
      return;
    }
    const prompt = `Summarize in **${lines} lines** with bullet points and bold key terms:\n\n---\n\n${last.parts[0].text}`;
    sendSystemQuery(
      prompt,
      "You are a summarization expert.",
      `Summarize the last response in ${lines} lines.`
    );
  }

  // ---------- QUIZ GENERATOR ----------

  quizGeneratorButton?.addEventListener("click", () => {
    const last = chatHistory.filter((m) => m.role === "model").pop();
    if (!last) {
      createMessage(
        "There's no conversation to create a quiz from yet.",
        "ai",
        true
      );
      return;
    }
    const quizQuery = `Based on the following text, create a multiple-choice quiz with 3 questions. Provide the correct answer after the options for each question.\n\n---\n\n${last.parts[0].text}`;
    sendSystemQuery(
      quizQuery,
      "You are a quiz generation expert.",
      "Create a quiz from our conversation."
    );
  });

  // ---------- TOOLTIP SETUP ----------

  document.querySelectorAll(".explain-btn").forEach((btn) => {
    btn.addEventListener("mouseover", (e) => {
      tooltip.textContent = btn.dataset.tooltip;
      tooltip.style.opacity = "1";
      tooltip.style.left = `${e.clientX + 15}px`;
      tooltip.style.top = `${e.clientY + 15}px`;
    });
    btn.addEventListener("mousemove", (e) => {
      tooltip.style.left = `${e.clientX + 15}px`;
      tooltip.style.top = `${e.clientY + 15}px`;
    });
    btn.addEventListener("mouseout", () => {
      tooltip.style.opacity = "0";
    });
  });

  // ---------- AVATAR PANEL TOGGLE ----------

  avatarPanelToggle?.addEventListener("click", () => {
    document.body.classList.toggle("panel-open");
  });

  // ---------- SUMMARY BUTTONS ----------

  summaryShortButton?.addEventListener("click", () => summarizeConversation(7));
  summaryLongButton?.addEventListener("click", () => summarizeConversation(12));

  // ---------- INPUT EVENTS ----------

  sendButton?.addEventListener("click", sendMessage);

  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // ---------- VOICE INPUT ----------

  if ("webkitSpeechRecognition" in window) {
    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    micButton.addEventListener("click", () => {
      micButton.style.color = "#ef4444";
      recognition.start();
    });

    recognition.onresult = ({ results }) => {
      input.value = results[0][0].transcript;
      sendMessage();
    };
    recognition.onend = () => (micButton.style.color = "white");
    recognition.onerror = () => {
      micButton.style.color = "white";
      createMessage("🎤 Couldn't understand speech.", "ai");
    };
  } else {
    micButton.style.display = "none";
  }

  // ---------- LOCATION BUTTON ----------

  locButton?.addEventListener("click", async () => {
    createMessage("Requesting your location…", "ai", true);
    const city = await getUserLocationByPermission();
    if (city) {
      cachedCity = city;
      createMessage(`📍 Using your current location: ${city}`, "ai", true);
    } else {
      cachedCity = "Mumbai";
      createMessage(
        "Couldn't access your location. Defaulting to Mumbai.",
        "ai",
        true
      );
    }
  });

  // ---------- NAV LINKS WITH SOUND ----------

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      const soundId = link.getAttribute("data-sound-id");
      const sound = document.getElementById(soundId);
      if (!sound) return;
      e.preventDefault();
      sound.currentTime = 0;
      sound.play();
      sound.addEventListener(
        "ended",
        function handleEnd() {
          window.location.href = link.getAttribute("href");
          sound.removeEventListener("ended", handleEnd);
        },
        { once: true }
      );
    });
  });

  // ---------- INITIAL MESSAGE ----------

  createMessage(
    "Hello! I'm your assistant, now with enhanced features — light/dark theme, voice, summaries, quizzes, and more. Ask me anything.",
    "ai",
    true
  );
  scrollToBottom(chatContainer);
});

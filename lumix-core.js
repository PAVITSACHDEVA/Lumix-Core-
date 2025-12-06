/* =====================================================================================
      LUMIX CORE — FRONTEND AI ENGINE (SAFE BACKEND MODE)
   ===================================================================================== */

/* --- Configuration --- */
const AI_NAME = "Lumix Core";
const BACKEND_URL = "https://lumix-core.onrender.com/api/gemini"; // SAFE – no API key exposed

/* --- Sanitization Helpers --- */
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* =====================================================================================
      BACKEND COMMUNICATION
   ===================================================================================== */

/**
 * Sends prompt to your backend at /api/gemini
 * Backend handles: API key, Gemini model, JSON correctness, errors.
 */
async function callGenerativeAPI(prompt) {
  try {
    const res = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Backend error:", data);
      return { text: "❌ Server error: " + (data.error || "Unknown backend failure.") };
    }

    return { text: data.reply || "❌ No response received." };

  } catch (err) {
    console.error("Frontend connection error:", err);
    return { text: "❌ Could not reach AI server. Is Render sleeping?" };
  }
}

/* =====================================================================================
      FRONTEND UI SYSTEM
   ===================================================================================== */

function scrollToBottom(container) {
  if (!container) return;
  container.scrollTop = container.scrollHeight;
}

function createMessage(content, sender = "ai", isMarkdown = false) {
  const chatContainer = document.querySelector("[data-testid='chat-container']");
  if (!chatContainer) return;

  const msg = document.createElement("div");
  msg.className = `message ${sender} mb-4`;

  const timestamp = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const safeText = escapeHtml(content);

  const finalContent = isMarkdown
    ? `<div class="markdown-body">${marked.parse(content)}</div>`
    : safeText;

  msg.innerHTML = `
      <div class="font-bold mb-1">${sender === "ai" ? AI_NAME : "You"}</div>
      <div class="message-content">${finalContent}</div>
      <div class="text-xs opacity-60 mt-1">${timestamp}</div>
  `;

  chatContainer.appendChild(msg);
  scrollToBottom(chatContainer);
}

function showTyping() {
  const chatContainer = document.querySelector("[data-testid='chat-container']");
  const typing = document.createElement("div");
  typing.className = "message ai";
  typing.dataset.testid = "typing-indicator";

  typing.innerHTML = `
      <div class="font-bold mb-1">${AI_NAME}</div>
      <div class="typing-indicator">
          <div class="animated-cursor"></div> Typing...
      </div>
  `;

  chatContainer.appendChild(typing);
  scrollToBottom(chatContainer);
}

function hideTyping() {
  const indicator = document.querySelector("[data-testid='typing-indicator']");
  if (indicator) indicator.remove();
}

/* =====================================================================================
      MAIN CHAT LOGIC
   ===================================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const input = document.querySelector("[data-testid='chat-input']");
  const sendButton = document.querySelector("[data-testid='send-button']");
  const summaryShortButton = document.querySelector("[data-testid='summary-short']");
  const summaryLongButton = document.querySelector("[data-testid='summary-long']");
  const quizButton = document.getElementById("quiz-generator");

  /* ---- Send Message ---- */
  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    createMessage(text, "user");
    input.value = "";

    showTyping();

    const result = await callGenerativeAPI(text);

    hideTyping();
    createMessage(result.text, "ai", true);
  }

  /* ---- Event Listeners ---- */
  sendButton?.addEventListener("click", sendMessage);

  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  /* ---- Summaries ---- */
  summaryShortButton?.addEventListener("click", () => {
    sendSummary(7);
  });

  summaryLongButton?.addEventListener("click", () => {
    sendSummary(12);
  });

  async function sendSummary(lines) {
    showTyping();
    const result = await callGenerativeAPI(`Summarize in ${lines} lines.`);
    hideTyping();
    createMessage(result.text, "ai", true);
  }

  /* ---- Quiz ---- */
  quizButton?.addEventListener("click", async () => {
    showTyping();
    const result = await callGenerativeAPI("Create a 3-question multiple-choice quiz from our chat.");
    hideTyping();
    createMessage(result.text, "ai", true);
  });

  /* ---- Welcome Message ---- */
  createMessage(
    "Hello! I'm your assistant — upgraded, secure, backend-powered, and enhanced with summaries, quizzes, and clean UI. Ask me anything!",
    "ai",
    true
  );
});

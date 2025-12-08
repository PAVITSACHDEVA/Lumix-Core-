/* ============================================================
   LUMIX CORE – FRONTEND CLIENT (BACKEND SAFE VERSION)
   NO API KEY IS EVER USED IN THIS FILE
   This file communicates ONLY with:
   https://lumix-core.onrender.com/api/gemini
============================================================ */

console.log("%cLumix Core Frontend Loaded", "color:#7df; font-size:16px;");

const API_URL = "https://lumix-core.onrender.com/api/gemini";

// Chat elements
const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

// Memory system
let conversationMemory = [];

/* ============================================================
   HELPERS
============================================================ */

function addMessage(text, sender = "bot") {
    const msg = document.createElement("div");
    msg.className = sender === "bot" ? "msg bot-msg" : "msg user-msg";
    msg.innerHTML = text;
    chatBox.appendChild(msg);

    chatBox.scrollTo({
        top: chatBox.scrollHeight,
        behavior: "smooth"
    });
}

function sanitize(str) {
    return str.replace(/[<>]/g, "");
}

/* ============================================================
   SEND MESSAGE
============================================================ */

async function sendMessage() {
    let text = userInput.value.trim();
    if (!text) return;

    addMessage(sanitize(text), "user");
    userInput.value = "";

    // Add to memory
    conversationMemory.push({ role: "user", content: text });

    addMessage("⏳ <i>Thinking...</i>", "bot");
    const thinkingNode = chatBox.lastChild;

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text })
        });

        const data = await response.json();

        if (data.error) {
            thinkingNode.innerHTML = `❌ Gemini API error:<br>${JSON.stringify(data.details)}`;
            return;
        }

        thinkingNode.innerHTML = sanitize(data.reply);

        // Save bot output in memory
        conversationMemory.push({ role: "assistant", content: data.reply });

    } catch (err) {
        thinkingNode.innerHTML = "⚠️ Network error. Backend unreachable.";
    }
}

/* ============================================================
   EVENT LISTENERS
============================================================ */

sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
});

/* ============================================================
   AUTO WELCOME MESSAGE
============================================================ */

window.onload = () => {
    addMessage("Hello! I'm your upgraded Lumix Core — 100% secure backend, zero leaked keys, and full features enabled. Ask me anything!");
};

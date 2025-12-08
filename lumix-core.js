/* ============================================================
   Lumix Core — Frontend Connected to Render Backend
   Works with: https://lumix-core.onrender.com/api/gemini
============================================================ */

console.log("Lumix Core frontend loaded.");

const API_URL = "https://lumix-core.onrender.com/api/gemini";  // ✅ Secure backend endpoint

// UI elements
const inputBox = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const chatWindow = document.getElementById("chat-window");

// Append message to chat window
function addMessage(sender, text) {
  const bubble = document.createElement("div");
  bubble.className = sender === "user" ? "user-message" : "ai-message";
  bubble.innerText = text;
  chatWindow.appendChild(bubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Send user query
async function sendMessage() {
  const message = inputBox.value.trim();
  if (!message) return;

  addMessage("user", message);
  inputBox.value = "";

  addMessage("ai", "⏳ Thinking...");

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });

    const data = await res.json();

    // Replace "Thinking..." with AI's answer
    chatWindow.lastChild.innerText = data.reply || "⚠️ Error: No response.";

  } catch (err) {
    chatWindow.lastChild.innerText = "❌ Backend error: " + err.message;
  }
}

// Event listeners
sendBtn.addEventListener("click", sendMessage);
inputBox.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

// Initial greeting
addMessage("ai", "Hello! I'm Lumix Core. Ask me anything!");

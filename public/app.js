const form = document.querySelector("#chatForm");
const input = document.querySelector("#messageInput");
const messages = document.querySelector("#messages");
const userId = localStorage.getItem("companionUserId") || crypto.randomUUID();

localStorage.setItem("companionUserId", userId);

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = input.value.trim();
  if (!message) return;

  input.value = "";
  addBubble("user", message);
  setBusy(true);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: `web:${userId}`, message })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.error || "Request failed");
    addBubble("assistant", data.reply);
  } catch (error) {
    addBubble("assistant", `亲爱的，我这边接口刚刚卡了一下：${error.message}`);
  } finally {
    setBusy(false);
  }
});

function addBubble(role, text) {
  const bubble = document.createElement("article");
  bubble.className = `bubble ${role}`;
  bubble.textContent = text;
  messages.appendChild(bubble);
  messages.scrollTop = messages.scrollHeight;
}

function setBusy(isBusy) {
  form.querySelector("button").disabled = isBusy;
  input.disabled = isBusy;
  if (!isBusy) input.focus();
}

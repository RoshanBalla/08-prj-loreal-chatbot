/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");

/* Cloudflare Worker endpoint */
const cloudflareUrl = "https://gentle-hat-f94d.ballaroshan1.workers.dev/";

/* Keep full conversation context for the API */
const messages = [
  {
    role: "system",
    content:
      "You are a L'Oréal beauty consultant. Only answer questions about L'Oréal products, skincare routines, haircare routines, makeup, and beauty guidance. If a user asks about unrelated topics, politely refuse and redirect them to L'Oréal beauty topics.",
  },
];

/* Personalization state */
let userName = "";
let isWaitingForName = true;

/* Track the current turn so the latest question stays directly above the reply */
let activeTurn = null;

function scrollToBottom() {
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function createBubble(role, text) {
  const bubble = document.createElement("div");
  bubble.className = `msg ${role}`;
  bubble.textContent = text;
  return bubble;
}

function createTurn() {
  const turn = document.createElement("div");
  turn.className = "turn";
  chatWindow.appendChild(turn);
  return turn;
}

function addMessage(role, text) {
  if (!activeTurn || role === "assistant") {
    activeTurn = createTurn();
  }

  const bubble = createBubble(role, text);
  activeTurn.appendChild(bubble);
  scrollToBottom();
}

function addUserMessage(text) {
  activeTurn = createTurn();
  const bubble = createBubble("user", text);
  activeTurn.appendChild(bubble);
  scrollToBottom();
}

function addTypingIndicator() {
  const typing = document.createElement("div");
  typing.className = "msg assistant typing";
  typing.setAttribute("id", "typingIndicator");
  typing.innerHTML =
    '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
  activeTurn.appendChild(typing);
  scrollToBottom();
}

function removeTypingIndicator() {
  const typing = document.getElementById("typingIndicator");
  if (typing) {
    typing.remove();
  }
}

function setLoadingState(isLoading) {
  userInput.disabled = isLoading;
  sendBtn.disabled = isLoading;
}

/* Initial assistant prompt asks for the user's name */
chatWindow.innerHTML = "";
addMessage(
  "assistant",
  "Hello! I am your L'Oréal Smart Routine & Product Advisor. What is your name?",
);

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const latestQuestion = userInput.value.trim();
  if (!latestQuestion) {
    return;
  }

  userInput.value = "";

  // Always show the user's latest question in a new turn.
  addUserMessage(latestQuestion);

  if (isWaitingForName) {
    userName = latestQuestion;
    isWaitingForName = false;

    messages.push({ role: "user", content: latestQuestion });
    messages.push({
      role: "system",
      content: `The user's name is ${userName}. Use their name naturally in your responses.`,
    });

    const welcomeReply = `Great to meet you, ${userName}! Ask me anything about L'Oréal products, routines, or beauty concerns, and I will help you build a smart routine.`;
    activeTurn.appendChild(createBubble("assistant", welcomeReply));
    messages.push({ role: "assistant", content: welcomeReply });
    scrollToBottom();
    return;
  }

  messages.push({
    role: "user",
    content: `${userName}: ${latestQuestion}`,
  });

  setLoadingState(true);
  addTypingIndicator();

  try {
    const response = await fetch(cloudflareUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      throw new Error("Request failed");
    }

    const data = await response.json();
    const assistantReply =
      data.choices?.[0]?.message?.content?.trim() ||
      `Thanks, ${userName}. I could not generate a full answer right now. Please try again.`;

    removeTypingIndicator();
    activeTurn.appendChild(createBubble("assistant", assistantReply));
    messages.push({ role: "assistant", content: assistantReply });
    scrollToBottom();
  } catch (error) {
    removeTypingIndicator();

    const errorReply =
      "I am having trouble reaching the L'Oréal advisor service right now. Please try again in a moment.";
    activeTurn.appendChild(createBubble("assistant", errorReply));
    messages.push({ role: "assistant", content: errorReply });
    scrollToBottom();
  } finally {
    setLoadingState(false);
    userInput.focus();
  }
});

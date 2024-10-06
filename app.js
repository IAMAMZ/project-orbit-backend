const { CohereClient } = require("cohere-ai");
const dotenv = require("dotenv");
const express = require("express");
let cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());

dotenv.config();

const cohere = new CohereClient({
  token: process.env.COHERE_KEY,
});

app.post("/chat", async (req, res, next) => {
  const transcribedText = req.body.message; // The message array from the frontend
  console.log("Received chat history:", transcribedText);

  // Filter out any invalid entries in the chat history
  const validMessages = transcribedText.filter(
    (msg) => msg.role && msg.message && msg.message.trim() !== ''
  );

  // Ensure there is at least one user message before proceeding
  if (validMessages.length === 0) {
    return res.status(400).json({ error: "Invalid message history" });
  }

  // Separate the last user message from the chat history
  const lastUserMessage = validMessages[validMessages.length - 1];
  const chatHistory = validMessages.slice(0, validMessages.length - 1); // Previous messages

  try {
    // Send the previous chat history and the last message separately
    const response = await cohere.chat({
      chatHistory: chatHistory, // The history before the last message
      message: "Don't talk about anything other related to space, and very Briefly answer"+lastUserMessage.message, // The last user message
      
    });

    // Log the response from Cohere
    console.log("Cohere response:", response.text);

    // Return the chatbot's response back to the frontend
    res.status(200).json({
      message: response.text, // Send back the bot's response
    });
  } catch (error) {
    console.error("Error from Cohere API:", error);
    res.status(500).json({ error: "Error processing the message" });
  }
});

app.post("/general", async (req, res, next) => {
  // Assuming the text is sent in a JSON object with a key "text"
  const transcribedText = req.body.text;
  console.log("print ",transcribedText)
  let cohereResponse = "";
  await (async () => {
    const chatStream = await cohere.chatStream({
      message: ` You are project orbit, an educational tool used to answer space related questions answer 
      this very briefly and accuratley ${transcribedText}`,
      // perform web search before answering the question. You can also use your own custom connector.
      connectors: [{ id: "web-search" }],
    });

    for await (const message of chatStream) {
      if (message.eventType === "text-generation") {
        console.log(message);
        cohereResponse = cohereResponse + message.text;
      }
    }
  })();

  console.log(`Received text: ${cohereResponse}`);

  // For demonstration, echoing back the received text with a message
  res.status(200).json({
    message: cohereResponse,
  });
});



app.listen(3001, () => {
  console.log("App listening on port 3001");
});

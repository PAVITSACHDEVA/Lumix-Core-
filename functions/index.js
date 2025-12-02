const functions = require("firebase-functions");
const {GoogleGenerativeAI} = require("@google/generative-ai");

exports.geminiChat = functions.https.onRequest(async (req, res) => {
  try {
    const genAI = new GoogleGenerativeAI(functions.config().gemini.key);
    const model = genAI.getGenerativeModel({model: "gemini-1.5-pro"});

    const prompt = req.body.prompt || "Hello Gemini!";
    const result = await model.generateContent(prompt);

    res.json({reply: result.response.text()});
  } catch (error) {
    console.error(error);
    res.status(500).send("Error calling Gemini API");
  }
});

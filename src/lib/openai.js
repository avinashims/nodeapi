const OpenAI = require("openai");

let client = null;

function getOpenAIKey() {
  const raw = process.env.OPENAI_API_KEY;
  if (!raw || typeof raw !== "string") {
    return "";
  }
  return raw.trim().replace(/^["']|["']$/g, "");
}

function isOpenAIConfigured() {
  return Boolean(getOpenAIKey());
}

function getOpenAIClient() {
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    return null;
  }
  if (!client) {
    client = new OpenAI({ apiKey });
  }
  return client;
}

function getOpenAIModel() {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

module.exports = { isOpenAIConfigured, getOpenAIClient, getOpenAIModel };

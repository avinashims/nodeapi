const OpenAI = require("openai");

let client = null;

function isOpenAIConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function getOpenAIClient() {
  if (!isOpenAIConfigured()) {
    return null;
  }
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

function getOpenAIModel() {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

module.exports = { isOpenAIConfigured, getOpenAIClient, getOpenAIModel };

const { createClient } = require("redis");

let client = null;
let ready = false;

function getRedisClient() {
  return client;
}

function isRedisReady() {
  return ready && client?.isOpen;
}

async function connectRedis() {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn("REDIS_URL not set — API will run without Redis cache");
    return false;
  }

  client = createClient({ url });

  client.on("error", (err) => {
    ready = false;
    console.error("Redis error:", err.message);
  });

  client.on("ready", () => {
    ready = true;
  });

  try {
    await client.connect();
    ready = true;
    console.log("Redis connected");
    return true;
  } catch (err) {
    ready = false;
    console.error("Redis connection failed:", err.message);
    return false;
  }
}

async function disconnectRedis() {
  if (client?.isOpen) {
    await client.quit();
  }
  ready = false;
}

module.exports = {
  connectRedis,
  disconnectRedis,
  getRedisClient,
  isRedisReady,
};

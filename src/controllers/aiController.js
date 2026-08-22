const prisma = require("../lib/prisma");
const { AppError } = require("../lib/errors");
const { isOpenAIConfigured, getOpenAIClient, getOpenAIModel } = require("../lib/openai");

const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY = 8;
const CATALOG_LIMIT = 40;

function requireOpenAI() {
  if (!isOpenAIConfigured()) {
    throw new AppError("AI is not configured. Set OPENAI_API_KEY in .env", 503, "AI_NOT_CONFIGURED");
  }
}

function parseMessage(body) {
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) {
    throw new AppError("message is required", 400, "VALIDATION_ERROR");
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new AppError(`message must be ${MAX_MESSAGE_LENGTH} characters or fewer`, 400, "VALIDATION_ERROR");
  }
  return message;
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter((item) => item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string")
    .slice(-MAX_HISTORY)
    .map((item) => ({
      role: item.role,
      content: item.content.trim().slice(0, MAX_MESSAGE_LENGTH),
    }))
    .filter((item) => item.content);
}

function formatCatalogLine(product) {
  const category = product.category?.name || "Uncategorized";
  const description = (product.description || "").replace(/\s+/g, " ").slice(0, 140);
  return `ID:${product.id} | ${product.name} | ${category} | ₹${product.price} | stock:${product.stock}${description ? ` | ${description}` : ""}`;
}

function mapOpenAIError(err) {
  const status = err.status || err.statusCode;
  if (status === 429) {
    return new AppError("AI is busy. Try again shortly.", 429, "AI_RATE_LIMIT");
  }
  if (status === 401) {
    return new AppError("AI authentication failed. Check OPENAI_API_KEY.", 502, "AI_AUTH");
  }
  return new AppError("AI request failed. Try again.", 502, "AI_PROVIDER_ERROR");
}

async function chat(req, res, next) {
  try {
    requireOpenAI();
    const message = parseMessage(req.body);
    const history = sanitizeHistory(req.body?.history);

    const products = await prisma.product.findMany({
      take: CATALOG_LIMIT,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        stock: true,
        imageUrl: true,
        category: { select: { id: true, name: true } },
      },
    });

    const catalog = products.length
      ? products.map(formatCatalogLine).join("\n")
      : "(catalog is empty)";

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: getOpenAIModel(),
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are ShopVerse's shopping assistant. Recommend ONLY products from this catalog. If nothing matches, say so politely and do not invent products.
Catalog:
${catalog}

Respond as JSON with this shape:
{"reply":"helpful concise answer","productIds":[numeric ids from the catalog]}
productIds can be empty. Never include ids that are not in the catalog.`,
        },
        ...history,
        { role: "user", content: message },
      ],
    });

    let parsed = { reply: "", productIds: [] };
    try {
      parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
    } catch {
      parsed = { reply: completion.choices[0]?.message?.content || "", productIds: [] };
    }

    const catalogIds = new Set(products.map((product) => product.id));
    const suggestedIds = (Array.isArray(parsed.productIds) ? parsed.productIds : [])
      .map((id) => Number(id))
      .filter((id) => catalogIds.has(id))
      .slice(0, 5);

    const suggestedProducts = suggestedIds.map((id) => products.find((product) => product.id === id)).filter(Boolean);

    return res.json({
      success: true,
      data: {
        reply: typeof parsed.reply === "string" && parsed.reply.trim()
          ? parsed.reply.trim()
          : "I could not generate a reply. Please try again.",
        products: suggestedProducts,
      },
    });
  } catch (err) {
    if (err instanceof AppError) {
      return next(err);
    }
    if (err?.status || err?.statusCode) {
      return next(mapOpenAIError(err));
    }
    return next(err);
  }
}

async function generateProductDescription(req, res, next) {
  try {
    requireOpenAI();

    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (!name) {
      throw new AppError("Product name is required", 400, "VALIDATION_ERROR");
    }

    const category = typeof req.body?.category === "string" ? req.body.category.trim() : "";
    const notes = typeof req.body?.notes === "string" ? req.body.notes.trim() : "";
    const priceRaw = req.body?.price;
    const price = priceRaw === undefined || priceRaw === null || priceRaw === "" ? "" : String(priceRaw).trim();

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: getOpenAIModel(),
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "You write concise ecommerce product descriptions for an Indian store. Use 2-4 sentences, focus on benefits, stay factual, and do not use markdown or quotation marks around the whole text.",
        },
        {
          role: "user",
          content: `Write a product description.
Name: ${name}
Category: ${category || "General"}
Price: ${price ? `₹${price}` : "not set"}
Extra notes: ${notes || "none"}`,
        },
      ],
    });

    const description = completion.choices[0]?.message?.content?.trim();
    if (!description) {
      throw new AppError("AI did not return a description. Try again.", 502, "AI_PROVIDER_ERROR");
    }

    return res.json({
      success: true,
      data: { description },
    });
  } catch (err) {
    if (err instanceof AppError) {
      return next(err);
    }
    if (err?.status || err?.statusCode) {
      return next(mapOpenAIError(err));
    }
    return next(err);
  }
}

module.exports = { chat, generateProductDescription };

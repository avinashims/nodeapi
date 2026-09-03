const prisma = require("../prisma");
const { invalidateProductCache } = require("../cache");

const MAX_BATCH_SIZE = Math.min(Math.max(parseInt(process.env.IMPORT_BATCH_MAX, 10) || 1000, 1), 5000);
const SAVE_CHUNK_SIZE = 500;

function normalizeRow(raw) {
  if (!raw || typeof raw !== "object") {
    return { row: raw, errors: ["Row must be an object"] };
  }

  const errors = [];
  const data = {};

  const name = typeof raw.name === "string" ? raw.name.trim() : String(raw.name ?? "").trim();
  if (!name) {
    errors.push("name is required");
  } else if (name.length > 191) {
    errors.push("name must be 191 characters or fewer");
  } else {
    data.name = name;
  }

  if (raw.description !== undefined && raw.description !== null && raw.description !== "") {
    data.description = String(raw.description).trim() || null;
  } else {
    data.description = null;
  }

  const price = parseFloat(raw.price);
  if (raw.price === undefined || raw.price === null || raw.price === "") {
    errors.push("price is required");
  } else if (Number.isNaN(price) || price < 0) {
    errors.push("price must be a non-negative number");
  } else {
    data.price = price;
  }

  if (raw.stock === undefined || raw.stock === null || raw.stock === "") {
    data.stock = 0;
  } else {
    const stock = parseInt(raw.stock, 10);
    if (Number.isNaN(stock) || stock < 0) {
      errors.push("stock must be a non-negative integer");
    } else {
      data.stock = stock;
    }
  }

  if (raw.imageUrl !== undefined && raw.imageUrl !== null && raw.imageUrl !== "") {
    const imageUrl = String(raw.imageUrl).trim();
    if (imageUrl.length > 500) {
      errors.push("imageUrl is too long");
    } else {
      data.imageUrl = imageUrl;
    }
  } else {
    data.imageUrl = null;
  }

  if (raw.categoryId === undefined || raw.categoryId === null || raw.categoryId === "") {
    errors.push("categoryId is required");
  } else {
    const categoryId = parseInt(raw.categoryId, 10);
    if (Number.isNaN(categoryId) || categoryId <= 0) {
      errors.push("categoryId must be a positive integer");
    } else {
      data.categoryId = categoryId;
    }
  }

  return { data, errors };
}

async function loadValidCategoryIds(categoryIds) {
  const unique = [...new Set(categoryIds)];
  if (!unique.length) {
    return new Set();
  }
  const rows = await prisma.category.findMany({
    where: { id: { in: unique } },
    select: { id: true },
  });
  return new Set(rows.map((row) => row.id));
}

function validateProductBatch(items) {
  if (!Array.isArray(items)) {
    return { error: "items must be an array" };
  }
  if (!items.length) {
    return { error: "items array cannot be empty" };
  }
  if (items.length > MAX_BATCH_SIZE) {
    return { error: `Maximum ${MAX_BATCH_SIZE} items per request` };
  }

  const valid = [];
  const invalid = [];

  items.forEach((raw, index) => {
    const { data, errors } = normalizeRow(raw);
    if (errors.length) {
      invalid.push({ index, errors, row: raw });
    } else {
      valid.push({ index, data });
    }
  });

  return { valid, invalid };
}

async function attachCategoryErrors(valid, invalid) {
  const categoryIds = valid.map((entry) => entry.data.categoryId);
  const existing = await loadValidCategoryIds(categoryIds);

  const stillValid = [];
  for (const entry of valid) {
    if (!existing.has(entry.data.categoryId)) {
      invalid.push({
        index: entry.index,
        errors: [`categoryId ${entry.data.categoryId} not found`],
      });
    } else {
      stillValid.push(entry);
    }
  }

  invalid.sort((a, b) => a.index - b.index);
  return stillValid;
}

async function validateProducts(items) {
  const batch = validateProductBatch(items);
  if (batch.error) {
    return { error: batch.error };
  }

  const valid = await attachCategoryErrors(batch.valid, batch.invalid);

  return {
    total: items.length,
    validCount: valid.length,
    invalidCount: batch.invalid.length,
    valid: valid.map((entry) => entry.data),
    errors: batch.invalid,
    preview: valid.slice(0, 3).map((entry) => entry.data),
  };
}

async function saveProducts(processedRows, { invalidateCache = true } = {}) {
  let saved = 0;

  for (let i = 0; i < processedRows.length; i += SAVE_CHUNK_SIZE) {
    const chunk = processedRows.slice(i, i + SAVE_CHUNK_SIZE);
    const result = await prisma.product.createMany({ data: chunk });
    saved += result.count;
  }

  if (saved > 0 && invalidateCache) {
    try {
      await invalidateProductCache();
    } catch (err) {
      console.error("Import cache invalidate error:", err.message);
    }
  }

  return saved;
}

async function importProducts(items) {
  const validation = await validateProducts(items);
  if (validation.error) {
    return { error: validation.error, status: 400 };
  }

  if (validation.invalidCount > 0) {
    return {
      status: 400,
      code: "VALIDATION_FAILED",
      message: "Fix validation errors before importing",
      data: {
        total: validation.total,
        valid: validation.validCount,
        invalid: validation.invalidCount,
        errors: validation.errors,
      },
    };
  }

  const saved = await saveProducts(validation.valid);

  return {
    status: 201,
    message: `Imported ${saved} product(s)`,
    data: {
      total: validation.total,
      saved,
      preview: validation.preview,
    },
  };
}

module.exports = {
  MAX_BATCH_SIZE,
  SAVE_CHUNK_SIZE,
  normalizeRow,
  loadValidCategoryIds,
  validateProducts,
  importProducts,
  saveProducts,
};

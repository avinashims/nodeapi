const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse");
const prisma = require("../prisma");
const {
  normalizeRow,
  saveProducts,
  SAVE_CHUNK_SIZE,
} = require("./productImport");
const { invalidateProductCache } = require("../cache");

const MAX_ERROR_SAMPLES = 100;
const CATEGORY_CACHE_REFRESH = 5000;

function mapCsvRecord(record) {
  const mapped = {};
  for (const [key, value] of Object.entries(record)) {
    mapped[key.trim().toLowerCase()] = value;
  }

  return {
    name: mapped.name,
    description: mapped.description,
    price: mapped.price,
    stock: mapped.stock,
    categoryId: mapped.categoryid ?? mapped.category_id,
    imageUrl: mapped.imageurl ?? mapped.image_url,
  };
}

async function loadCategoryIds() {
  const rows = await prisma.category.findMany({ select: { id: true } });
  return new Set(rows.map((row) => row.id));
}

async function flushBatch(batch, dryRun) {
  if (!batch.length || dryRun) {
    return batch.length;
  }
  return saveProducts(batch, { invalidateCache: false });
}

async function importProductsFromCsv(filePath, options = {}) {
  const dryRun = Boolean(options.dryRun);
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    return { error: "CSV file not found", status: 404 };
  }

  let categoryIds = await loadCategoryIds();

  let line = 0;
  let valid = 0;
  let invalid = 0;
  let saved = 0;
  const errors = [];
  let batch = [];
  let rowsSinceCategoryRefresh = 0;

  const stream = fs.createReadStream(absolutePath);
  const parser = stream.pipe(
    parse({
      columns: true,
      trim: true,
      skip_empty_lines: true,
      relax_column_count: true,
    })
  );

  for await (const record of parser) {
    line += 1;
    rowsSinceCategoryRefresh += 1;

    if (rowsSinceCategoryRefresh >= CATEGORY_CACHE_REFRESH) {
      categoryIds = await loadCategoryIds();
      rowsSinceCategoryRefresh = 0;
    }

    const { data, errors: rowErrors } = normalizeRow(mapCsvRecord(record));

    if (rowErrors.length) {
      invalid += 1;
      if (errors.length < MAX_ERROR_SAMPLES) {
        errors.push({ line, errors: rowErrors });
      }
      continue;
    }

    if (!categoryIds.has(data.categoryId)) {
      invalid += 1;
      if (errors.length < MAX_ERROR_SAMPLES) {
        errors.push({ line, errors: [`categoryId ${data.categoryId} not found`] });
      }
      continue;
    }

    valid += 1;
    batch.push(data);

    if (batch.length >= SAVE_CHUNK_SIZE) {
      saved += await flushBatch(batch, dryRun);
      batch = [];

      if (line % 10000 === 0) {
        console.log(`[CSV IMPORT] line=${line} valid=${valid} invalid=${invalid} saved=${saved}`);
      }
    }
  }

  if (batch.length) {
    saved += await flushBatch(batch, dryRun);
  }

  if (!dryRun && saved > 0) {
    try {
      await invalidateProductCache();
    } catch (err) {
      console.error("CSV import cache invalidate error:", err.message);
    }
  }

  return {
    status: dryRun ? 200 : 201,
    message: dryRun
      ? `Validated ${line} row(s) from CSV (dry run, nothing saved)`
      : `Imported ${saved} product(s) from CSV`,
    data: {
      file: path.basename(absolutePath),
      rowsRead: line,
      valid,
      invalid,
      saved: dryRun ? 0 : saved,
      errorSamples: errors,
      errorsTruncated: invalid > errors.length,
    },
  };
}

module.exports = { importProductsFromCsv, mapCsvRecord };

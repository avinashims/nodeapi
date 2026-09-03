#!/usr/bin/env node
/**
 * Local CSV import (no HTTP). Usage:
 *   node scripts/import-csv-local.js imports/csv/products-sample.csv
 *   node scripts/import-csv-local.js imports/csv/products-sample.csv --dry-run
 */
require("dotenv").config();
const path = require("path");
const { importProductsFromCsv } = require("../src/lib/import/csvProductImport");

const fileArg = process.argv[2];
const dryRun = process.argv.includes("--dry-run");

if (!fileArg) {
  console.error("Usage: node scripts/import-csv-local.js <path-to.csv> [--dry-run]");
  process.exit(1);
}

const filePath = path.resolve(fileArg);

importProductsFromCsv(filePath, { dryRun })
  .then((result) => {
    if (result.error) {
      console.error(result.error);
      process.exit(1);
    }
    console.log(result.message);
    console.log(JSON.stringify(result.data, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

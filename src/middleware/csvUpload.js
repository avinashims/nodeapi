const path = require("path");
const fs = require("fs");
const multer = require("multer");

const IMPORT_CSV_DIR = path.join(__dirname, "../../imports/csv");
const DEFAULT_MAX_BYTES = 15 * 1024 * 1024 * 1024; // 15 GB

fs.mkdirSync(IMPORT_CSV_DIR, { recursive: true });

function getMaxCsvBytes() {
  const parsed = parseInt(process.env.CSV_MAX_BYTES, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_BYTES;
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, IMPORT_CSV_DIR);
  },
  filename(req, file, cb) {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

function csvFileFilter(req, file, cb) {
  const name = file.originalname.toLowerCase();
  if (file.mimetype === "text/csv" || file.mimetype === "application/vnd.ms-excel" || name.endsWith(".csv")) {
    cb(null, true);
    return;
  }
  cb(new Error("Only CSV files are allowed"));
}

const uploadCsv = multer({
  storage,
  limits: { fileSize: getMaxCsvBytes() },
  fileFilter: csvFileFilter,
});

function resolveImportCsvPath(fileName) {
  const base = path.basename(fileName);
  const resolved = path.resolve(IMPORT_CSV_DIR, base);
  if (!resolved.startsWith(path.resolve(IMPORT_CSV_DIR))) {
    return null;
  }
  return resolved;
}

module.exports = {
  IMPORT_CSV_DIR,
  uploadCsv,
  resolveImportCsvPath,
};

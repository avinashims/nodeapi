const fs = require("fs");
const { validateProducts, importProducts } = require("../lib/import/productImport");
const { importProductsFromCsv } = require("../lib/import/csvProductImport");
const { resolveImportCsvPath } = require("../middleware/csvUpload");

function parseDryRun(value) {
  return value === true || value === "true" || value === "1";
}

async function validateProductImport(req, res) {
  try {
    const { items } = req.body;
    const result = await validateProducts(items);

    if (result.error) {
      return res.status(400).json({ success: false, message: result.error, code: "VALIDATION_ERROR" });
    }

    return res.status(200).json({
      success: true,
      message: result.invalidCount ? "Validation completed with errors" : "All rows are valid",
      data: {
        total: result.total,
        valid: result.validCount,
        invalid: result.invalidCount,
        errors: result.errors,
        preview: result.preview,
      },
    });
  } catch (error) {
    console.error("Validate import error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

async function processProductImport(req, res) {
  try {
    const { items } = req.body;
    const result = await importProducts(items);

    if (result.error) {
      return res.status(result.status || 400).json({
        success: false,
        message: result.error,
        code: "VALIDATION_ERROR",
      });
    }

    if (result.code === "VALIDATION_FAILED") {
      return res.status(400).json({
        success: false,
        message: result.message,
        code: result.code,
        data: result.data,
      });
    }

    return res.status(result.status).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error("Import products error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

async function runCsvImport(filePath, dryRun, res) {
  const result = await importProductsFromCsv(filePath, { dryRun });

  if (result.error) {
    return res.status(result.status || 400).json({
      success: false,
      message: result.error,
      code: "IMPORT_ERROR",
    });
  }

  return res.status(result.status).json({
    success: true,
    message: result.message,
    data: result.data,
  });
}

async function uploadCsvProductImport(req, res) {
  let uploadedPath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "CSV file is required (field name: file)" });
    }

    uploadedPath = req.file.path;
    const dryRun = parseDryRun(req.query.dryRun ?? req.body?.dryRun);

    return await runCsvImport(uploadedPath, dryRun, res);
  } catch (error) {
    console.error("CSV upload import error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  } finally {
    if (uploadedPath && fs.existsSync(uploadedPath)) {
      fs.unlink(uploadedPath, () => {});
    }
  }
}

async function processServerCsvImport(req, res) {
  try {
    const { fileName } = req.body;
    if (!fileName || typeof fileName !== "string") {
      return res.status(400).json({ success: false, message: "fileName is required" });
    }

    const filePath = resolveImportCsvPath(fileName);
    if (!filePath) {
      return res.status(400).json({ success: false, message: "Invalid file name" });
    }

    const dryRun = parseDryRun(req.query.dryRun ?? req.body?.dryRun);
    return await runCsvImport(filePath, dryRun, res);
  } catch (error) {
    console.error("Server CSV import error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

module.exports = {
  validateProductImport,
  processProductImport,
  uploadCsvProductImport,
  processServerCsvImport,
};

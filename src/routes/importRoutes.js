const express = require("express");
const {
  validateProductImport,
  processProductImport,
  uploadCsvProductImport,
  processServerCsvImport,
} = require("../controllers/importController");
const { authenticate, authorize } = require("../middleware/auth");
const { uploadCsv } = require("../middleware/csvUpload");

const router = express.Router();

router.post("/products/validate", authenticate, authorize("ADMIN"), validateProductImport);
router.post("/products", authenticate, authorize("ADMIN"), processProductImport);
router.post(
  "/products/csv",
  authenticate,
  authorize("ADMIN"),
  uploadCsv.single("file"),
  uploadCsvProductImport
);
router.post("/products/csv/file", authenticate, authorize("ADMIN"), processServerCsvImport);

module.exports = router;

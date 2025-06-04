import multer from "multer";

export const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/profilePictures");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

export const fileStorageForProduct = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/productImages");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

export const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/webp" ||
    file.mimetype === "image/avif"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

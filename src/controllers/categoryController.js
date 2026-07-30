const prisma = require("../lib/prisma");
const { invalidateProductCache } = require("../lib/cache");

function parseCategoryId(id) {
  const categoryId = parseInt(id, 10);
  if (isNaN(categoryId) || categoryId <= 0) {
    return null;
  }
  return categoryId;
}

async function getCategories(req, res) {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    });

    return res.status(200).json({ success: true, data: categories });
  } catch (error) {
    console.error("Get categories error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

async function getCategoryById(req, res) {
  try {
    const categoryId = parseCategoryId(req.params.id);
    if (!categoryId) {
      return res.status(400).json({ success: false, message: "Invalid category ID" });
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: { _count: { select: { products: true } } },
    });

    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    return res.status(200).json({ success: true, data: category });
  } catch (error) {
    console.error("Get category error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

async function createCategory(req, res) {
  try {
    const name = req.body.name?.trim();
    if (!name) {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }

    const existing = await prisma.category.findUnique({ where: { name } });
    if (existing) {
      return res.status(409).json({ success: false, message: "Category already exists" });
    }

    const category = await prisma.category.create({ data: { name } });
    await invalidateProductCache();
    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    console.error("Create category error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

async function updateCategory(req, res) {
  try {
    const categoryId = parseCategoryId(req.params.id);
    if (!categoryId) {
      return res.status(400).json({ success: false, message: "Invalid category ID" });
    }

    const name = req.body.name?.trim();
    if (!name) {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }

    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    const duplicate = await prisma.category.findFirst({
      where: { name, NOT: { id: categoryId } },
    });
    if (duplicate) {
      return res.status(409).json({ success: false, message: "Category name already in use" });
    }

    const updated = await prisma.category.update({
      where: { id: categoryId },
      data: { name },
    });

    await invalidateProductCache();

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Update category error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

async function deleteCategory(req, res) {
  try {
    const categoryId = parseCategoryId(req.params.id);
    if (!categoryId) {
      return res.status(400).json({ success: false, message: "Invalid category ID" });
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: { _count: { select: { products: true } } },
    });

    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    if (category._count.products > 0) {
      return res.status(409).json({
        success: false,
        message: "Cannot delete category with assigned products",
      });
    }

    await prisma.category.delete({ where: { id: categoryId } });
    await invalidateProductCache();
    return res.status(200).json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    console.error("Delete category error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};

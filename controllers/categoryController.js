import prisma from "../config/database.js";

export const createCategory = async (req, res) => {
  const { name } = req.body;

  try {
    const category = await prisma.category.create({
      data: {
        name,
      },
    });

    res.status(201).json({ category });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany();

    res.status(200).json(categories);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteCategoryById = async (req, res) => {
  const { id } = req.params;

  try {
    const category = await prisma.category.findUnique({
      where: {
        id: parseInt(id),
      },
    });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    await prisma.category.delete({
      where: {
        id: parseInt(id),
      },
    });

    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updateCategoryName = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    const updateCategory = await prisma.category.update({
      where: {
        id: parseInt(id),
      },
      data: {
        name,
      },
    });
    return res
      .status(200)
      .json({ message: "Category updated successfully", updateCategory });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

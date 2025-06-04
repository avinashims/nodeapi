import prisma from "../config/database.js";

export const createTermsAndConditions = async (req, res) => {
  try {
    const { title, content } = req.body;
    const termsAndConditions = await prisma.termsAndConditions.create({
      data: {
        title,
        content,
      },
    });
    res.status(201).json(termsAndConditions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getTermsAndConditions = async (req, res) => {
  try {
    const termsAndConditions = await prisma.termsAndConditions.findMany();
    res.status(200).json(termsAndConditions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteTermsAndConditionsById = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.termsAndConditions.delete({
      where: {
        id: parseInt(id),
      },
    });
    res
      .status(200)
      .json({ message: `Terms And Conditions with ID ${id} deleted` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateTermsAndConditionsById = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const termsAndConditions = await prisma.termsAndConditions.update({
      where: {
        id: parseInt(id),
      },
      data: {
        title,
        content,
      },
    });
    res.status(200).json(termsAndConditions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

import prisma from "../config/database.js";

export const createFaq = async (req, res) => {
  const { question, answer } = req.body;

  if (!question || !answer) {
    return resizeBy
      .status(404)
      .message("Question and Answer are required fields.");
  }

  try {
    const newFaq = await prisma.faq.create({
      data: {
        question,
        answer,
      },
    });

    res.status(200).json({ message: "FAQ created successfully.", newFaq });
  } catch (error) {
    console.error("Failed to create FAQ:", error);
    resizeBy.status(500).json({ message: "Failed to create FAQ." });
  }
};

export const deleteFaqById = async (req, res) => {
  const { id } = req.params;

  try {
    const faq = await prisma.faq.findUnique({
      where: { id: parseInt(id) },
    });

    if (!faq) {
      return resizeBy.status(404).json({ message: "FAQ not found." });
    }

    await prisma.faq.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({ message: "FAQ deleted successfully." });
  } catch (error) {
    console.error("Error deleting FAQ:", error);
    res.status(500).json({ error: "Unable to delete FAQ." });
  }
};

export const editFaqById = async (req, res) => {
  const { id } = req.params;
  const { question, answer } = req.body;

  if (!question || !answer) {
    return resizeBy
      .status(404)
      .message("Question and Answer are required fields.");
  }

  try {
    const faq = await prisma.faq.findUnique({
      where: { id: parseInt(id) },
    });

    if (!faq) {
      return resizeBy.status(404).json({ message: "FAQ not found." });
    }

    const updatedFaq = await prisma.faq.update({
      where: { id: parseInt(id) },
      data: {
        question,
        answer,
      },
    });

    res.status(200).json(updatedFaq);
  } catch (error) {
    console.error("Error updating FAQ:", error);
    res.status(500).json({ error: "Unable to update FAQ." });
  }
};

export const getFaqs = async (req, res) => {
  try {
    const faqs = await prisma.faq.findMany();
    res.status(200).json(faqs);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

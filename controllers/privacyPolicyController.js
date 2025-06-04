import prisma from "../config/database.js";

export const createPrivacyPolicy = async (req, res) => {
  try {
    const { title, content } = req.body;
    const privacyPolicy = await prisma.privacyPolicy.create({
      data: {
        title,
        content,
      },
    });
    res.status(201).json(privacyPolicy);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getPrivacyPolicy = async (req, res) => {
  try {
    const privacyPolicy = await prisma.privacyPolicy.findMany();
    res.status(200).json(privacyPolicy);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deletePrivacyPolicyById = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.privacyPolicy.delete({
      where: {
        id: parseInt(id),
      },
    });
    res.status(200).json({ message: `Privacy Policy with ID ${id} deleted` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updatePrivacyPolicyById = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const privacyPolicy = await prisma.privacyPolicy.update({
      where: {
        id: parseInt(id),
      },
      data: {
        title,
        content,
      },
    });
    res.status(200).json(privacyPolicy);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

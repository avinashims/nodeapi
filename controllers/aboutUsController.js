import prisma from "../config/database.js";

export const createAboutUs = async (req, res) => {
  const { title, content } = req.body;

  try {
    const newAboutUs = await prisma.aboutUs.create({
      data: {
        title,
        content,
      },
    });

    res
      .status(200)
      .json({ message: "About Us created successfully.", newAboutUs });
  } catch (error) {
    console.error("Failed to create About Us:", error);
    res.status(500).json({ message: "Failed to create About Us." });
  }
};

export const getAboutUs = async (req, res) => {
  try {
    const aboutUs = await prisma.aboutUs.findMany();

    res.status(200).json(aboutUs);
  } catch (error) {
    console.error("Error getting About Us:", error);
    res.status(500).json({ message: "Unable to get About Us." });
  }
};

export const deleteAboutUsById = async (req, res) => {
  const { id } = req.params;

  try {
    const aboutUs = await prisma.aboutUs.findUnique({
      where: { id: parseInt(id) },
    });

    if (!aboutUs) {
      return res.status(404).json({ message: "About Us not found." });
    }

    await prisma.aboutUs.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({ message: "About Us deleted successfully." });
  } catch (error) {
    console.error("Error deleting About Us:", error);
    res.status(500).json({ error: "Unable to delete About Us." });
  }
};

export const editAboutUsById = async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(404).json("Title and Content are required fields.");
  }

  try {
    const updatedAboutUs = await prisma.aboutUs.update({
      where: { id: parseInt(id) },
      data: {
        title,
        content,
      },
    });

    res
      .status(200)
      .json({ message: "About Us updated successfully.", updatedAboutUs });
  } catch (error) {
    console.error("Error updating About Us:", error);
    res.status(500).json({ error: "Unable to update About Us." });
  }
};

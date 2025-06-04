import prisma from "../config/database.js";

export const createCareers = async (req, res) => {
  const { title, content } = req.body;

  try {
    const newCareer = await prisma.careers.create({
      data: {
        title,
        content,
      },
    });

    res
      .status(200)
      .json({ message: "Career created successfully.", newCareer });
  } catch (error) {
    console.error("Failed to create Career:", error);
    res.status(500).json({ message: "Failed to create Career." });
  }
};

export const getCareers = async (req, res) => {
  try {
    const careers = await prisma.careers.findMany();

    res.status(200).json(careers);
  } catch (error) {
    console.error("Error getting Career:", error);
    res.status(500).json({ message: "Unable to get Career." });
  }
};

export const deleteCareerById = async (req, res) => {
  const { id } = req.params;

  try {
    const career = await prisma.careers.findUnique({
      where: { id: parseInt(id) },
    });

    if (!career) {
      return res.status(404).json({ message: "Career not found." });
    }

    await prisma.careers.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({ message: "Career deleted successfully." });
  } catch (error) {
    console.error("Error deleting Career:", error);
    res.status(500).json({ error: "Unable to delete Career." });
  }
};

export const editCareerById = async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(404).json("Title and Content are required fields.");
  }

  try {
    const updatedCareer = await prisma.careers.update({
      where: { id: parseInt(id) },
      data: {
        title,
        content,
      },
    });

    res
      .status(200)
      .json({ message: "Career updated successfully.", updatedCareer });
  } catch (error) {
    console.error("Error updating Career:", error);
    res.status(500).json({ error: "Unable to update Career." });
  }
};

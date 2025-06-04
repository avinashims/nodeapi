import prisma from "../config/database.js";

export const createTestimonial = async (req, res) => {
  const { quote, userId } = req.body;

  if (!quote || !userId) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const newTestimonial = await prisma.testimonial.create({
    data: {
      quote,
      userId,
    },
  });

  res.status(200).json({ message: "Testimonial created", newTestimonial });
};

export const getTestimonials = async (req, res) => {
  try {
    const testimonials = await prisma.testimonial.findMany({
      include: {
        user: true,
      },
    });
    res.json(testimonials);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch testimonials." });
  }
};

export const deleteTestimonialById = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.testimonial.delete({
      where: { id: parseInt(id) },
    });

    res.status(204).json({ message: "Review deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete testimonial" });
  }
};

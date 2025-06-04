import prisma from "../config/database.js";
import { transporter } from "../utils/contactAdmin.js";

export const contactAdmin = async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: "All fields are required" });
  }

  await prisma.message.create({
    data: {
      name,
      email,
      message,
    },
  });

  const mailOptions = {
    from: email,
    to: process.env.EMAIL_TO,
    subject: `ახალი სმს ${name} - სგან`,
    text: `სახელი: ${name}\nელ-ფოსტა: ${email}\nსმს: ${message}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Message sent" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ message: "Error sending email" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const messages = await prisma.message.findMany();

    res.status(200).json(messages);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteMessageById = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.message.delete({
      where: {
        id: parseInt(id),
      },
    });

    res.status(200).json({ message: "Message deleted" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const createContact = async (req, res) => {
  const { email, phone } = req.body;

  if (!email || !phone) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const newContact = await prisma.contact.create({
      data: {
        email,
        phone,
      },
    });

    res
      .status(200)
      .json({ message: "Contact created successfully.", newContact });
  } catch {
    console.error("Failed to create Contact:", error);
    res.status(500).json({ message: "Failed to create Contact." });
  }
};

export const getContacts = async (req, res) => {
  try {
    const contacts = await prisma.contact.findMany();

    res.status(200).json(contacts);
  } catch (error) {
    console.error("Error getting Contacts:", error);
    res.status(500).json({ message: "Unable to get Contacts." });
  }
};

export const deleteContactById = async (req, res) => {
  const { id } = req.params;

  try {
    const contact = await prisma.contact.findUnique({
      where: { id: parseInt(id) },
    });

    if (!contact) {
      return res.status(404).json({ message: "Contact not found." });
    }

    await prisma.contact.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({ message: "Contact deleted successfully." });
  } catch (error) {
    console.error("Error deleting Contact:", error);
    res.status(500).json({ error: "Unable to delete Contact." });
  }
};

export const editContactById = async (req, res) => {
  const { id } = req.params;
  const { email, phone } = req.body;

  if (!email || !phone) {
    return res.status(404).json("Email and Phone are required fields.");
  }

  try {
    await prisma.contact.update({
      where: { id: parseInt(id) },
      data: {
        email,
        phone,
      },
    });

    res.status(200).json({ message: "Contact updated successfully." });
  } catch (error) {
    console.error("Error updating Contact:", error);
    res.status(500).json({ message: "Unable to update Contact." });
  }
};

import prisma from "../config/database.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export const createAdmin = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  if ((!firstName, !lastName, !email || !password)) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await prisma.admin.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
      },
    });

    res.status(201).json(admin);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const admin = await prisma.admin.findUnique({
      where: {
        email,
      },
    });

    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);

    if (!passwordMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { email: admin.email, id: admin.id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.cookie("adminToken", token, {
      httpOnly: true,
      maxAge: 3600000,
      sameSite: true,
    });

    res.status(200).json({ message: "Login successful" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const logoutAdmin = async (req, res) => {
  try {
    res.cookie("adminToken", "", {
      httpOnly: true,
      expires: new Date(0),
      secure: true,
      sameSite: "none",
    });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Error logging out admin:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getAdmins = async (req, res) => {
  try {
    const admins = await prisma.admin.findMany();
    res.status(200).json(admins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteAdminById = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.admin.delete({
      where: {
        id: parseInt(id),
      },
    });

    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAdmin = async (req, res) => {
  try {
    const adminId = req.admin?.id;
    const admin = await prisma.admin.findUnique({
      where: {
        id: adminId,
      },
    });

    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    res.status(200).json(admin);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateAdmin = async (req, res) => {
  const { id } = req.params;
  const { email, password, firstName, lastName } = req.body;

  try {
    const admin = await prisma.admin.findUnique({
      where: {
        id: parseInt(id),
      },
    });

    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    const updates = {};

    if (email) {
      updates.email = email;
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.password = hashedPassword;
    }

    if (firstName) {
      updates.firstName = firstName;
    }

    if (lastName) {
      updates.lastName = lastName;
    }

    const updatedAdmin = await prisma.admin.update({
      where: {
        id: parseInt(id),
      },
      data: updates,
    });

    res.status(200).json(updatedAdmin);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateUserById = async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, email, password, isVerified } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: parseInt(id),
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const updates = {};

    if (firstName !== undefined) {
      updates.firstName = firstName;
    }

    if (lastName !== undefined) {
      updates.lastName = lastName;
    }

    if (email !== undefined) {
      updates.email = email;
    }

    if (password !== undefined) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.password = hashedPassword;
    }

    if (isVerified !== undefined) {
      updates.isVerified = isVerified;
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: parseInt(id),
      },
      data: updates,
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

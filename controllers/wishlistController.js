import prisma from "../config/database.js";

export const createWishlist = async (req, res) => {
  const { userId, productId } = req.body;

  try {
    const existingWishlistEntry = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId: parseInt(userId),
          productId: parseInt(productId),
        },
      },
    });
    if (existingWishlistEntry) {
      return res
        .status(400)
        .json({ message: "პროდუქტი უკვე დამატებულია სურვილების სიაში" });
    }

    const wishlist = await prisma.wishlist.create({
      data: {
        userId: parseInt(userId),
        productId: parseInt(productId),
      },
    });

    res.status(201).json({ wishlist });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getWishlist = async (req, res) => {
  const { userId } = req.params;

  try {
    const wishlist = await prisma.wishlist.findMany({
      where: {
        userId: parseInt(userId),
      },
      include: {
        product: true,
        Cart: true,
      },
    });

    res.status(200).json({ wishlist });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteWishlist = async (req, res) => {
  const { userId, productId } = req.params;

  if (!userId || !productId) {
    return res.status(400).json({ message: "Invalid request data" });
  }

  try {
    const wishlistEntry = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId: parseInt(userId),
          productId: parseInt(productId),
        },
      },
    });

    if (!wishlistEntry) {
      return res
        .status(400)
        .json({ message: "პროდუქტი არ მოიძებნა სურვილების სიაში" });
    }

    await prisma.wishlist.delete({
      where: {
        id: wishlistEntry.id,
      },
    });

    res.status(200).json({ message: "პროდუქტი წაიშალა სურვილების სიიდან." });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

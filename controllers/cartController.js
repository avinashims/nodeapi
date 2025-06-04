import prisma from "../config/database.js";

export const addToCart = async (req, res) => {
  const { userId, productId, quantity, colors, sizes } = req.body;

  try {
    if (!productId || !quantity || !colors || !sizes) {
      return res
        .status(400)
        .json({ error: "productId and quantity are required" });
    }

    const wishlistEntry = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId: parseInt(userId),
          productId: parseInt(productId),
        },
      },
    });

    const cartItem = await prisma.cart.create({
      data: {
        quantity: parseInt(quantity),
        colors,
        sizes,
        product: {
          connect: {
            id: parseInt(productId),
          },
        },
        user: {
          connect: {
            id: parseInt(userId),
          },
        },
        Wishlist: wishlistEntry
          ? {
              connect: {
                id: wishlistEntry.id,
              },
            }
          : undefined,
      },
      include: {
        product: true,
      },
    });

    res.status(201).json({ message: "პროდუქტი დაემატა კალათაში.", cartItem });
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({ error: "Unable to add to cart" });
  }
};

export const getUserCart = async (req, res) => {
  const { userId } = req.params;

  try {
    const cartItems = await prisma.cart.findMany({
      where: {
        userId: parseInt(userId),
      },
      include: {
        product: true,
      },
    });

    res.status(200).json(cartItems);
  } catch (error) {
    console.error("Error getting cart items:", error);
    res.status(500).json({ error: "Unable to get cart items" });
  }
};

export const removeFromCart = async (req, res) => {
  const { userId, productId } = req.params;

  if (!userId || !productId) {
    return res.status(400).json({ message: "Invalid request data" });
  }

  try {
    const cartItem = await prisma.cart.findFirst({
      where: {
        userId: parseInt(userId),
        productId: parseInt(productId),
      },
    });

    if (!cartItem) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    await prisma.cart.delete({
      where: {
        id: cartItem.id,
      },
    });

    res.status(200).json({ message: "პროდუქტი წაიშალა კალათიდან." });
  } catch (error) {
    console.error("Error removing from cart:", error);
    res.status(500).json({ error: "Unable to remove from cart" });
  }
};

import prisma from "../config/database.js";

export const getTopModels = async (req, res) => {
  try {
    const productsWithWishlistCount = await prisma.product.findMany({
      include: {
        _count: {
          select: { wishlist: true },
        },
      },
      orderBy: {
        wishlist: {
          _count: "desc",
        },
      },
    });
    const topModels = productsWithWishlistCount.filter(
      (product) => product._count.wishlist > 0
    );

    const formattedTopModels = topModels.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      images: product.images,
      stock: product.stock,
      wishlistCount: product._count.wishlist,
    }));

    res.json(formattedTopModels);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch top models." });
  }
};

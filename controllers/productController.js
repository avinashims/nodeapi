import prisma from "../config/database.js";

export const createProduct = async (req, res) => {
  const {
    name,
    description,
    price,
    stock,
    colors,
    sizes,
    isOnSale,
    salePercentage,
    shipping,
    categoryId,
  } = req.body;

  const { file } = req;

  if (
    !name ||
    !description ||
    !price ||
    !stock ||
    !colors ||
    !sizes ||
    !shipping ||
    !categoryId ||
    !file
  ) {
    return res.status(400).json({ message: "შეავსეთ ყველა ველი." });
  }
  const isOnSaleBoolean = isOnSale === "true";

  if (isOnSaleBoolean && !salePercentage) {
    return res.status(400).json({ message: "მიუთითეთ ფასდაკლების პროცენტი." });
  }

  try {
    const images = {
      set: [`productImages/${file.originalname}`],
    };
    const product = await prisma.product.create({
      data: {
        name,
        description,
        price,
        images: images,
        stock: parseInt(stock),
        colors,
        sizes,
        shipping,
        isOnSale: isOnSaleBoolean,
        salePercentage: isOnSaleBoolean ? parseInt(salePercentage) : null,
        category: {
          connect: { id: parseInt(categoryId) },
        },
      },
    });

    res.status(201).json({ product });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        wishlist: true,
        cart: true,
      },
    });

    res.status(200).json(products);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getProductById = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await prisma.product.findUnique({
      where: {
        id: parseInt(id),
      },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({ product });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updateProduct = async (req, res) => {
  const { id } = req.params;

  const {
    name,
    description,
    price,
    stock,
    colors,
    sizes,
    shipping,
    categoryId,
    isOnSale,
    salePercentage,
  } = req.body;

  try {
    const isOnSaleBoolean = isOnSale === "true";

    if (isOnSaleBoolean && !salePercentage) {
      return res
        .status(400)
        .json({ message: "მიუთითეთ ფასდაკლების პროცენტი." });
    }

    const product = await prisma.product.update({
      where: {
        id: parseInt(id),
      },
      data: {
        name,
        description,
        price,
        stock,
        colors,
        sizes,
        shipping,
        isOnSale: isOnSaleBoolean,
        salePercentage: isOnSaleBoolean ? parseInt(salePercentage) : null,
        categoryId: parseInt(categoryId),
      },
    });

    res.status(200).json({ product });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteProductById = async (req, res) => {
  const { id } = req.params;

  try {
    const productId = parseInt(id);

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        wishlist: true,
        cart: true,
        topModel: true,
      },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await prisma.wishlist.deleteMany({
      where: { productId: productId },
    });

    await prisma.cart.deleteMany({
      where: { productId: productId },
    });

    await prisma.topModel.deleteMany({
      where: { productId: productId },
    });

    await prisma.product.delete({
      where: { id: productId },
    });

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getProductsByCategory = async (req, res) => {
  const { categoryId } = req.params;

  try {
    const products = await prisma.product.findMany({
      where: {
        categoryId: parseInt(categoryId),
      },
    });

    res.status(200).json({ products });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

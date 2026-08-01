const prisma = require("../lib/prisma");
const { cacheGet, cacheSet, invalidateProductCache, logCache } = require("../lib/cache");
const { cacheKeys } = require("../lib/cacheKeys");
const { applyUploadedImage, deleteLocalUpload } = require("../middleware/upload");

function parseProductId(id) {
  const productId = parseInt(id, 10);
  if (isNaN(productId) || productId <= 0) {
    return null;
  }
  return productId;
}

const productInclude = {
  category: { select: { id: true, name: true } },
};

async function resolveCategoryId(categoryIdRaw, isUpdate = false) {
  if (categoryIdRaw === undefined || categoryIdRaw === null || categoryIdRaw === "") {
    if (isUpdate) {
      return { value: undefined };
    }
    return { error: "Category is required" };
  }

  const categoryId = parseInt(categoryIdRaw, 10);
  if (isNaN(categoryId) || categoryId <= 0) {
    return { error: "Valid category ID is required" };
  }

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    return { error: "Category not found" };
  }

  return { value: categoryId };
}

async function validateProductInput(body, isUpdate = false) {
  const { name, description, price, stock, imageUrl, categoryId } = body;
  const data = {};

  if (!isUpdate || name !== undefined) {
    if (!name || typeof name !== "string" || !name.trim()) {
      return { error: "Product name is required" };
    }
    data.name = name.trim();
  }

  if (!isUpdate || price !== undefined) {
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return { error: "Valid price is required" };
    }
    data.price = parsedPrice;
  }

  if (description !== undefined) {
    data.description = description?.trim() || null;
  }

  if (stock !== undefined) {
    const parsedStock = parseInt(stock, 10);
    if (isNaN(parsedStock) || parsedStock < 0) {
      return { error: "Stock must be a non-negative number" };
    }
    data.stock = parsedStock;
  } else if (!isUpdate) {
    data.stock = 0;
  }

  if (imageUrl !== undefined) {
    data.imageUrl = imageUrl?.trim() || null;
  }

  if (!isUpdate || categoryId !== undefined) {
    const categoryResult = await resolveCategoryId(categoryId, isUpdate);
    if (categoryResult.error) {
      return { error: categoryResult.error };
    }
    if (categoryResult.value !== undefined) {
      data.categoryId = categoryResult.value;
    }
  }

  return { data };
}

async function getProducts(req, res) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 50);
    const search = req.query.search?.trim();
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId, 10) : null;
    const cacheKey = cacheKeys.productsList(page, limit, search, categoryId);

    const cached = await cacheGet(cacheKey);

    if (cached) {
      console.log("[CACHE HIT] products from Redis:", cached.data?.products);
      res.set("X-Cache", "HIT");
      return res.status(200).json(cached);
    }

    logCache("MISS", cacheKey);
    console.log("[CACHE MISS] loading products from MySQL...");
    const skip = (page - 1) * limit;

    const where = {};
    if (search) {
      where.OR = [{ name: { contains: search } }, { description: { contains: search } }];
    }
    if (categoryId && !isNaN(categoryId)) {
      where.categoryId = categoryId;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: productInclude,
      }),
      prisma.product.count({ where }),
    ]);

    const response = {
      success: true,
      data: {
        products,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };

    await cacheSet(cacheKey, response, 300);
    console.log("[CACHE SET] products saved to Redis:", products);
    res.set("X-Cache", "MISS");
    return res.status(200).json(response);
  } catch (error) {
    console.error("Get products error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

async function getProductById(req, res) {
  try {
    const productId = parseProductId(req.params.id);
    if (!productId) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const cacheKey = cacheKeys.productById(productId);
    const cached = await cacheGet(cacheKey);
    if (cached) {
      console.log("[CACHE HIT] product from Redis:", cached.data);
      res.set("X-Cache", "HIT");
      return res.status(200).json(cached);
    }

    logCache("MISS", cacheKey);
    console.log("[CACHE MISS] loading product from MySQL, id:", productId);
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: productInclude,
    });
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const response = { success: true, data: product };
    await cacheSet(cacheKey, response, 120);
    console.log("[CACHE SET] product saved to Redis:", product);
    res.set("X-Cache", "MISS");
    return res.status(200).json(response);
  } catch (error) {
    console.error("Get product error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

async function addProduct(req, res) {
  try {
    const validation = await validateProductInput(req.body);
    if (validation.error) {
      return res.status(400).json({ success: false, message: validation.error });
    }

    applyUploadedImage(validation.data, req.file);

    const product = await prisma.product.create({
      data: validation.data,
      include: productInclude,
    });
    await invalidateProductCache();

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    console.error("Add product error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

async function editProduct(req, res) {
  try {
    const productId = parseProductId(req.params.id);
    if (!productId) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const validation = await validateProductInput(req.body, true);
    if (validation.error) {
      return res.status(400).json({ success: false, message: validation.error });
    }

    applyUploadedImage(validation.data, req.file);

    if (Object.keys(validation.data).length === 0) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    const existingProduct = await prisma.product.findUnique({ where: { id: productId } });
    if (!existingProduct) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (req.file && existingProduct.imageUrl) {
      deleteLocalUpload(existingProduct.imageUrl);
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: validation.data,
      include: productInclude,
    });

    await invalidateProductCache(productId);

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    console.error("Edit product error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

async function deleteProduct(req, res) {
  try {
    const productId = parseProductId(req.params.id);
    if (!productId) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: { _count: { select: { orderItems: true } } },
    });

    if (!existingProduct) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (existingProduct._count.orderItems > 0) {
      return res.status(409).json({
        success: false,
        message: "Cannot delete product linked to existing orders",
      });
    }

    await prisma.product.delete({ where: { id: productId } });
    deleteLocalUpload(existingProduct.imageUrl);
    await invalidateProductCache(productId);

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

module.exports = {
  getProducts,
  getProductById,
  addProduct,
  editProduct,
  deleteProduct,
};

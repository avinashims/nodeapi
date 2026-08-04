const prisma = require("../lib/prisma");
const { toNumber } = require("../lib/utils");

async function getOrCreateCart(userId) {
  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: { product: true },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
      include: {
        items: {
          include: { product: true },
          orderBy: { id: "asc" },
        },
      },
    });
  }

  return cart;
}

function formatCart(cart) {
  const items = cart.items.map((item) => ({
    id: item.id,
    productId: item.productId,
    quantity: item.quantity,
    product: {
      id: item.product.id,
      name: item.product.name,
      price: item.product.price,
      stock: item.product.stock,
      imageUrl: item.product.imageUrl,
    },
    subtotal: toNumber(item.product.price) * item.quantity,
  }));

  const total = items.reduce((sum, item) => sum + item.subtotal, 0);

  return {
    id: cart.id,
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    total,
  };
}

async function getCart(req, res) {
  try {
    const cart = await getOrCreateCart(req.user.id);
    return res.status(200).json({ success: true, data: formatCart(cart) });
  } catch (error) {
    console.error("Get cart error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

async function addToCart(req, res) {
  try {
    const productId = parseInt(req.body.productId, 10);
    const quantity = parseInt(req.body.quantity, 10) || 1;

    if (isNaN(productId) || productId <= 0) {
      return res.status(400).json({ success: false, message: "Valid product ID is required" });
    }

    if (isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({ success: false, message: "Quantity must be at least 1" });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ success: false, message: "Insufficient stock" });
    }

    const cart = await getOrCreateCart(req.user.id);
    const existingItem = cart.items.find((item) => item.productId === productId);
    const newQuantity = (existingItem?.quantity || 0) + quantity;

    if (product.stock < newQuantity) {
      return res.status(400).json({ success: false, message: "Insufficient stock" });
    }

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });
    } else {
      await prisma.cartItem.create({
        data: { cartId: cart.id, productId, quantity },
      });
    }

    const updatedCart = await getOrCreateCart(req.user.id);
    return res.status(200).json({
      success: true,
      message: "Product added to cart",
      data: formatCart(updatedCart),
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

async function updateCartItem(req, res) {
  try {
    const productId = parseInt(req.params.productId, 10);
    const quantity = parseInt(req.body.quantity, 10);

    if (isNaN(productId) || productId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    if (isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({ success: false, message: "Quantity must be at least 1" });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ success: false, message: "Insufficient stock" });
    }

    const cart = await getOrCreateCart(req.user.id);
    const cartItem = cart.items.find((item) => item.productId === productId);

    if (!cartItem) {
      return res.status(404).json({ success: false, message: "Product not in cart" });
    }

    await prisma.cartItem.update({
      where: { id: cartItem.id },
      data: { quantity },
    });

    const updatedCart = await getOrCreateCart(req.user.id);
    return res.status(200).json({
      success: true,
      message: "Cart updated",
      data: formatCart(updatedCart),
    });
  } catch (error) {
    console.error("Update cart error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

async function removeFromCart(req, res) {
  try {
    const productId = parseInt(req.params.productId, 10);
    if (isNaN(productId) || productId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const cart = await getOrCreateCart(req.user.id);
    const cartItem = cart.items.find((item) => item.productId === productId);

    if (!cartItem) {
      return res.status(404).json({ success: false, message: "Product not in cart" });
    }

    await prisma.cartItem.delete({ where: { id: cartItem.id } });

    const updatedCart = await getOrCreateCart(req.user.id);
    return res.status(200).json({
      success: true,
      message: "Product removed from cart",
      data: formatCart(updatedCart),
    });
  } catch (error) {
    console.error("Remove from cart error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

async function clearCart(req, res) {
  try {
    const cart = await getOrCreateCart(req.user.id);
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    const updatedCart = await getOrCreateCart(req.user.id);
    return res.status(200).json({
      success: true,
      message: "Cart cleared",
      data: formatCart(updatedCart),
    });
  } catch (error) {
    console.error("Clear cart error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
};

async function decrementStockForItems(tx, orderItems) {
  for (const item of orderItems) {
    const product = item.product || (await tx.product.findUnique({ where: { id: item.productId } }));
    if (!product || product.stock < item.quantity) {
      throw new Error(`Insufficient stock for ${product?.name || `product #${item.productId}`}`);
    }
  }

  for (const item of orderItems) {
    await tx.product.update({
      where: { id: item.productId },
      data: { stock: { decrement: item.quantity } },
    });
  }
}

async function incrementStockForItems(tx, orderItems) {
  for (const item of orderItems) {
    await tx.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } },
    });
  }
}

function orderStockWasReserved(order) {
  return order.paymentStatus === "PAID" || order.paymentMethod === "COD";
}

module.exports = {
  decrementStockForItems,
  incrementStockForItems,
  orderStockWasReserved,
};

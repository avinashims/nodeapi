const CACHE_PREFIX = "ecom:";

const cacheKeys = {
  productsList: (page, limit, search, categoryId) =>
    `${CACHE_PREFIX}products:list:p${page}:l${limit}:s${search || "all"}:c${categoryId || "all"}`,
  productById: (id) => `${CACHE_PREFIX}products:id:${id}`,
  customerDashboard: (userId) => `${CACHE_PREFIX}dashboard:user:${userId}`,
  adminDashboard: () => `${CACHE_PREFIX}dashboard:admin`,
  productsPattern: () => `${CACHE_PREFIX}products:*`,
};

module.exports = { CACHE_PREFIX, cacheKeys };

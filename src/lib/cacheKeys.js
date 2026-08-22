const CACHE_PREFIX = "ecom:";

const cacheKeys = {
  productsVersion: () => `${CACHE_PREFIX}cache:products-ver`,
  productsList: (version, page, limit, search, categoryId) =>
    `${CACHE_PREFIX}products:list:v${version}:p${page}:l${limit}:s${search || "all"}:c${categoryId || "all"}`,
  productById: (version, id) => `${CACHE_PREFIX}products:id:v${version}:${id}`,
  customerDashboard: (userId) => `${CACHE_PREFIX}dashboard:user:${userId}`,
  adminDashboard: () => `${CACHE_PREFIX}dashboard:admin`,
  productsPattern: () => `${CACHE_PREFIX}products:*`,
};

module.exports = { CACHE_PREFIX, cacheKeys };

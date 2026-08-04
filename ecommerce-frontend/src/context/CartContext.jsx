import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { cartApi } from "../api/client";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart(null);
      return;
    }
    setLoading(true);
    try {
      const res = await cartApi.get();
      setCart(res.data);
    } catch {
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  async function addToCart(productId, quantity = 1) {
    const res = await cartApi.add({ productId, quantity });
    setCart(res.data);
    return res;
  }

  async function updateQuantity(productId, quantity) {
    const res = await cartApi.update(productId, { quantity });
    setCart(res.data);
    return res;
  }

  async function removeItem(productId) {
    const res = await cartApi.remove(productId);
    setCart(res.data);
    return res;
  }

  async function clearCart() {
    const res = await cartApi.clear();
    setCart(res.data);
    return res;
  }

  const value = useMemo(
    () => ({
      cart,
      loading,
      itemCount: cart?.itemCount || 0,
      refreshCart,
      addToCart,
      updateQuantity,
      removeItem,
      clearCart,
    }),
    [cart, loading, refreshCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

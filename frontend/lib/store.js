'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [cart, setCart] = useState([]); // [{ id, name, price, image_url, stock, quantity }]

  useEffect(() => {
    try {
      const auth = JSON.parse(localStorage.getItem('auth') || 'null');
      if (auth) { setUser(auth.user); setToken(auth.token); }
      setCart(JSON.parse(localStorage.getItem('cart') || '[]'));
    } catch (e) { /* ignore corrupt storage */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart, ready]);

  const login = useCallback((data) => {
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('auth', JSON.stringify(data));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth');
  }, []);

  const addToCart = useCallback((p, qty = 1) => {
    setCart((c) => {
      const found = c.find((i) => i.id === p.id);
      if (found) {
        return c.map((i) =>
          i.id === p.id ? { ...i, quantity: Math.min(p.stock, i.quantity + qty) } : i
        );
      }
      return [...c, { id: p.id, name: p.name, price: p.price, image_url: p.image_url, stock: p.stock, quantity: Math.min(p.stock, qty) }];
    });
  }, []);

  const setQty = useCallback((id, quantity) => {
    setCart((c) =>
      c.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, Math.min(i.stock, quantity)) } : i))
    );
  }, []);

  const removeFromCart = useCallback((id) => setCart((c) => c.filter((i) => i.id !== id)), []);
  const clearCart = useCallback(() => setCart([]), []);

  const cartCount = cart.reduce((n, i) => n + i.quantity, 0);
  const cartTotal = cart.reduce((n, i) => n + i.quantity * i.price, 0);

  return (
    <Ctx.Provider value={{ ready, user, token, login, logout, cart, addToCart, setQty, removeFromCart, clearCart, cartCount, cartTotal }}>
      {children}
    </Ctx.Provider>
  );
}

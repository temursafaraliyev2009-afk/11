import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useLanguage } from './LanguageContext';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { lang, setLang } = useLanguage();

  // Cart Items
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('savatchi_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Wishlist Items
  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = localStorage.getItem('savatchi_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Currency (UZS or USD)
  const [currency, setCurrency] = useState('UZS'); // 'UZS' or 'USD'
  const exchangeRate = 12800; // 1 USD = 12,800 UZS

  // Unified Language ('UZ', 'RU', 'EN') linked to LanguageContext
  const language = (lang || 'uz').toUpperCase();
  const setLanguage = (newLang) => {
    if (newLang) setLang(newLang.toLowerCase());
  };

  // Active Region
  const [region, setRegion] = useState({ id: 'tashkent', name: 'Toshkent shahri', time: '15-30 daqiqa' });

  // Drawer / Modal states
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedProductModal, setSelectedProductModal] = useState(null);

  // Promo Code
  const [discountPercent, setDiscountPercent] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState('');

  // Toast Notifications
  const [toasts, setToasts] = useState([]);

  // Orders History
  const [orders, setOrders] = useState(() => {
    try {
      const saved = localStorage.getItem('savatchi_orders');
      return saved ? JSON.parse(saved) : [
        {
          id: 'ORD-8921',
          date: '2026-09-08 14:30',
          total: 15630000,
          status: 'Yetkazildi',
          itemsCount: 2,
          deliveryAddress: 'Toshkent, Chilonzor 19, 45-uy'
        }
      ];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('savatchi_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('savatchi_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    localStorage.setItem('savatchi_orders', JSON.stringify(orders));
  }, [orders]);

  // Listen for real-time status updates and deletions from the admin dashboard
  useEffect(() => {
    const handleStatusUpdate = (e) => {
      const { id, status } = e.detail || {};
      if (id && status) {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
      }
    };

    const handleOrderDeleted = (e) => {
      const { id } = e.detail || {};
      if (id) {
        setOrders(prev => prev.filter(o => o.id !== id));
      }
    };

    window.addEventListener('savatchi_order_status_updated', handleStatusUpdate);
    window.addEventListener('savatchi_order_deleted', handleOrderDeleted);
    return () => {
      window.removeEventListener('savatchi_order_status_updated', handleStatusUpdate);
      window.removeEventListener('savatchi_order_deleted', handleOrderDeleted);
    };
  }, []);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  const addToCart = (product, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, { ...product, quantity }];
    });
    showToast(`"${product.name.slice(0, 25)}..." Savatchaga qo'shildi!`, 'success');
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
    showToast("Mahsulot savatchadan olib tashlandi", 'info');
  };

  const updateQuantity = (productId, delta) => {
    setCart(prev =>
      prev.map(item => {
        if (item.id === productId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : item;
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const toggleWishlist = (product) => {
    setWishlist(prev => {
      const exists = prev.some(item => item.id === product.id);
      if (exists) {
        showToast("Saralanganlardan olib tashlandi", 'info');
        return prev.filter(item => item.id !== product.id);
      } else {
        showToast("Saralanganlarga saqlandi ❤️", 'success');
        return [...prev, product];
      }
    });
  };

  const isInWishlist = (productId) => {
    return wishlist.some(item => item.id === productId);
  };

  const applyPromoCode = (code) => {
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode === 'SAVATCHI2026') {
      setDiscountPercent(15);
      setAppliedCoupon('SAVATCHI2026 (15% Chegirma)');
      showToast("15% Promo-kod muvaffaqiyatli qo'llandi! 🎉", 'success');
      return true;
    } else if (cleanCode === 'SUPER10') {
      setDiscountPercent(10);
      setAppliedCoupon('SUPER10 (10% Chegirma)');
      showToast("10% Promo-kod muvaffaqiyatli qo'llandi! 🎉", 'success');
      return true;
    } else {
      showToast("Noto'g'ri promo-kod kiritildi", 'error');
      return false;
    }
  };

  const createOrder = (shippingDetails) => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discountAmount = (subtotal * discountPercent) / 100;
    const finalTotal = subtotal - discountAmount;

    const newOrder = {
      id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toLocaleString('uz-UZ'),
      total: finalTotal,
      status: 'Hali yo‘lda',
      itemsCount: cart.reduce((sum, item) => sum + item.quantity, 0),
      items: [...cart],
      deliveryAddress: `${shippingDetails.address}, ${shippingDetails.city}`,
      paymentMethod: shippingDetails.paymentMethod
    };

    setOrders(prev => [newOrder, ...prev]);

    // Sync order to active store admin dashboard in localStorage
    try {
      const activeStoreId = localStorage.getItem('savatchi_selected_store') || 'store_food';
      const storeOrdersKey = 'savatchi_orders_' + activeStoreId;
      const productSummary = cart.map(i => `${i.name} (x${i.quantity || 1})`).join(', ');

      const adminOrder = {
        id: newOrder.id,
        product: productSummary || 'Onlayn Xarid',
        supplier: shippingDetails.fullName || 'Onlayn Xaridor',
        customerName: shippingDetails.fullName || 'Onlayn Xaridor',
        phone: shippingDetails.phone || '',
        deliveryAddress: `${shippingDetails.address}, ${shippingDetails.city}`,
        date: new Date().toISOString().split('T')[0],
        qty: `${cart.reduce((sum, item) => sum + (item.quantity || 1), 0)} dona`,
        total: finalTotal,
        status: 'Hali yo‘lda',
        type: 'customer',
        items: [...cart],
        storeId: activeStoreId
      };

      const existingRaw = localStorage.getItem(storeOrdersKey);
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      localStorage.setItem(storeOrdersKey, JSON.stringify([adminOrder, ...existing]));

      // Dispatch event for real-time update in open tabs/components
      window.dispatchEvent(new CustomEvent('savatchi_order_created', { detail: adminOrder }));
    } catch (e) {
      console.warn('Failed to sync order to admin store:', e);
    }

    clearCart();
    setDiscountPercent(0);
    setAppliedCoupon('');
    setIsCheckoutOpen(false);
    showToast(`Buyurtma #${newOrder.id} qabul qilindi! Express yetkazib berish yo'lga chiqmoqda.`, 'success');
    return newOrder;
  };

  const formatPrice = (priceInUZS) => {
    if (currency === 'USD') {
      const usd = (priceInUZS / exchangeRate).toFixed(2);
      return `$${usd}`;
    }
    return `${priceInUZS.toLocaleString('uz-UZ')} so'm`;
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = (cartSubtotal * discountPercent) / 100;
  const cartTotal = cartSubtotal - discountAmount;

  return (
    <CartContext.Provider
      value={{
        cart,
        wishlist,
        currency,
        setCurrency,
        language,
        setLanguage,
        region,
        setRegion,
        isCartOpen,
        setIsCartOpen,
        isCheckoutOpen,
        setIsCheckoutOpen,
        selectedProductModal,
        setSelectedProductModal,
        discountPercent,
        appliedCoupon,
        toasts,
        orders,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        toggleWishlist,
        isInWishlist,
        applyPromoCode,
        createOrder,
        formatPrice,
        cartSubtotal,
        discountAmount,
        cartTotal
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);

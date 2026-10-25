import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ShoppingCart, Plus, Minus, Trash2, Search, CheckCircle } from 'lucide-react';
import { PRODUCTS } from '../data/products';

export const SalesPage = () => {
  const { t, tProduct } = useLanguage();
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const updateQty = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : item;
      }
      return item;
    }));
  };

  const removeItem = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setIsSuccess(true);
    setTimeout(() => {
      setCart([]);
      setIsSuccess(false);
    }, 2000);
  };

  const filtered = PRODUCTS.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12 font-sans select-none">
      {/* Product Selection Grid (2 columns) */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              <span>{t('posTitle', 'Savdo Paneli / Kassa')}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{t('posSubtitle', 'Savdolar, tushum va sotilgan mahsulotlarni kuzating.')}</p>
          </div>
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder={t('searchProductPlaceholder', 'Mahsulot qidirish...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.map(p => (
            <div
              key={p.id}
              onClick={() => addToCart(p)}
              className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <img src={p.image} alt={p.name} className="w-full h-24 object-cover rounded-xl mb-2 group-hover:scale-105 transition-transform" />
              <div>
                <div className="text-xs font-bold text-slate-900 line-clamp-1">{tProduct(p.name)}</div>
                <div className="text-xs font-black text-blue-600 mt-1">{p.price.toLocaleString()} {t('sum', "so'm")}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Summary Column */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between h-[600px]">
        <div>
          <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3">
            {t('receiptTitle', 'Xarid Cheki')}
          </h3>

          <div className="mt-3 space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {cart.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs font-medium">
                {t('emptyCartPos', "Savat hozircha bo'sh")}
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="flex items-center justify-between text-xs border-b border-slate-50 pb-2">
                  <div>
                    <div className="font-bold text-slate-800">{tProduct(item.name)}</div>
                    <div className="text-[11px] text-slate-400">{item.price.toLocaleString()} {t('sum', "so'm")}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => updateQty(item.id, -1)} className="p-1 bg-slate-100 rounded-md">
                      <Minus className="w-3 h-3 text-slate-600" />
                    </button>
                    <span className="font-bold text-slate-900 w-4 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="p-1 bg-slate-100 rounded-md">
                      <Plus className="w-3 h-3 text-slate-600" />
                    </button>
                    <button onClick={() => removeItem(item.id)} className="p-1 text-rose-500 hover:bg-rose-50 rounded-md">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-slate-500">{t('totalAmountLabel', 'Jami Summa:')}</span>
            <span className="text-lg font-black text-emerald-600">{total.toLocaleString()} {t('sum', "so'm")}</span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className={`w-full font-bold py-3 rounded-2xl shadow-lg transition-all flex items-center justify-center space-x-2 ${
              isSuccess
                ? 'bg-emerald-600 text-white'
                : cart.length === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-95'
            }`}
          >
            {isSuccess ? (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>{t('checkoutSuccess', "To'lov Bajarildi!")}</span>
              </>
            ) : (
              <span>{t('confirmSale', "To'lovni Yopish")}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};


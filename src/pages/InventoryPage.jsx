import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { PRODUCTS as initialProducts } from '../data/products';
import { Package, Search, Plus, Trash2, Edit3, X } from 'lucide-react';

export const InventoryPage = () => {
  const { t, tProduct, tCategory, tUnit } = useLanguage();
  const { showUndoDelete } = useToast();
  const [products, setProducts] = useState(initialProducts);
  const [pendingDeleteIds, setPendingDeleteIds] = useState(() => new Set());
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [newP, setNewP] = useState({ name: '', price: '', stock: '', category: 'fresh' });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newP.name || !newP.price) return;
    const added = {
      id: `inv-${Date.now()}`,
      name: newP.name,
      price: Number(newP.price),
      stock: Number(newP.stock) || 10,
      category: newP.category,
      rating: 5.0,
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80'
    };
    setProducts([added, ...products]);
    setIsAddOpen(false);
    setNewP({ name: '', price: '', stock: '', category: 'fresh' });
  };

  const handleDelete = (id) => {
    const target = products.find(p => p.id === id);
    if (!target) return;

    // 1. Vaqtincha interfeysdan yashirish
    setPendingDeleteIds(prev => new Set(prev).add(id));

    // 2. 5 soniyalik bekor qilish bildirishnomasini ko'rsatish
    showUndoDelete({
      title: 'Mahsulot o‘chirilmoqda...',
      seconds: 5,
      successMessage: 'Mahsulot muvaffaqiyatli o‘chirildi.',
      onUndo: () => {
        setPendingDeleteIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      },
      onCommit: async () => {
        setProducts(prev => prev.filter(p => p.id !== id));
        setPendingDeleteIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    });
  };

  const filtered = products
    .filter(p => !pendingDeleteIds.has(p.id))
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 pb-12 font-sans select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center space-x-2">
            <Package className="w-5 h-5 text-blue-600" />
            <span>{t('inventoryManagementTitle', 'Ombor & Zaxiralar Boshqaruvi')}</span>
          </h2>
          <p className="text-xs text-slate-400">{t('inventoryManagementSubtitle', 'Mahsulot qoldig‘i va ombor qiymatini nazorat qiling.')}</p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder={t('searchProductPlaceholder', 'Mahsulot qidirish...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none"
            />
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-lg shadow-blue-600/20 flex items-center space-x-1.5 hover:opacity-95"
          >
            <Plus className="w-4 h-4" />
            <span>{t('addProductBtn', "Mahsulot Qo'shish")}</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
              <th className="p-4">{t('productCol', 'Mahsulot')}</th>
              <th className="p-4">{t('categoryCol', 'Kategoriya')}</th>
              <th className="p-4">{t('priceCol', 'Narxi')}</th>
              <th className="p-4">{t('stockCol', 'Zaxira miqdori')}</th>
              <th className="p-4 text-right">{t('actions', 'Amallar')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="p-4 flex items-center space-x-3">
                  <img src={p.image} alt={p.name} className="w-10 h-10 object-cover rounded-xl" />
                  <span className="font-bold text-slate-900">{tProduct(p.name)}</span>
                </td>
                <td className="p-4 uppercase font-bold text-blue-600">{tCategory(p.category)}</td>
                <td className="p-4 font-black">{p.price.toLocaleString()} {t('sum', "so'm")}</td>
                <td className="p-4">
                  <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full font-bold">
                    {p.stock || 45} {tUnit('dona')}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">{t('addNewProductTitle', "Yangi Mahsulot Qo'shish")}</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('productNameField', 'Nomi')}</label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Farg'ona Olmasi"
                  value={newP.name}
                  onChange={(e) => setNewP({ ...newP, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('priceField', "Narxi (So'm)")}</label>
                  <input
                    type="number"
                    required
                    placeholder="15000"
                    value={newP.price}
                    onChange={(e) => setNewP({ ...newP, price: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('stockField', 'Zaxira Soni')}</label>
                  <input
                    type="number"
                    placeholder="50"
                    value={newP.stock}
                    onChange={(e) => setNewP({ ...newP, stock: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg mt-2"
              >
                {t('save', 'Saqlash')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { X, Check, MapPin, CreditCard, Truck, ShieldCheck, Phone, User, CheckCircle2, ArrowRight } from 'lucide-react';

export const CheckoutModal = () => {
  const { t } = useLanguage();
  const {
    isCheckoutOpen,
    setIsCheckoutOpen,
    cart,
    cartTotal,
    formatPrice,
    createOrder,
    region
  } = useCart();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '+998 ',
    city: region.name,
    address: '',
    comment: '',
    paymentMethod: 'click'
  });

  const [isSuccess, setIsSuccess] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);

  if (!isCheckoutOpen) return null;

  const handleSubmitOrder = (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.address) {
      alert(t('fillRequiredFields', "Iltimos, ismingiz va manzilingizni to'liq kiriting."));
      return;
    }

    const newOrder = createOrder(formData);
    setCreatedOrder(newOrder);
    setIsSuccess(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-950/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-gray-100">
              {isSuccess ? t('orderAcceptedTitle', 'Buyurtma Qabul Qilindi! 🎉') : t('proceedCheckout', 'Buyurtmani Rasmiylashtirish')}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {isSuccess ? t('orderContactSoon', 'Kuryerimiz tez orada siz bilan bog\'lanadi') : t('enterAddressPayment', 'Manzil va to\'lov turini kiriting')}
            </p>
          </div>

          <button
            onClick={() => {
              setIsCheckoutOpen(false);
              setIsSuccess(false);
            }}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {isSuccess ? (
          <div className="p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                {t('thankYouOrder', 'Rahmat, buyurtmangiz')} #{createdOrder?.id} {t('saved', 'rasmiylashtirildi!')}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                {t('deliveryAddressLabel', 'Yetkazib berish manzili:')} <strong className="text-gray-800 dark:text-gray-200">{createdOrder?.deliveryAddress}</strong>
              </p>
            </div>

            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 max-w-md mx-auto text-left text-xs space-y-2">
              <div className="flex justify-between font-semibold text-emerald-800 dark:text-emerald-300">
                <span>{t('status', 'Holati:')}</span>
                <span className="bg-emerald-500 text-white px-2 py-0.5 rounded-full text-[10px]">{t('orderStatusOnTheWayExpress', 'Express Kuryer Yo\'lda')}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>{t('totalAmount', 'Jami summangiz:')}</span>
                <span className="font-bold">{formatPrice(createdOrder?.total || 0)}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setIsCheckoutOpen(false);
                setIsSuccess(false);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm py-3 px-8 rounded-2xl shadow-lg transition-all"
            >
              {t('back', 'Bosh sahifaga qaytish')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmitOrder} className="p-6 sm:p-8 space-y-6">
            {/* Step Tabs */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setStep(1)}
                className={`flex items-center space-x-2 ${step === 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 1 ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-slate-800'}`}>1</span>
                <span>{t('delivery', 'Yetkazib Berish')}</span>
              </button>

              <div className="w-8 h-0.5 bg-gray-200 dark:bg-slate-800" />

              <button
                type="button"
                onClick={() => setStep(2)}
                className={`flex items-center space-x-2 ${step === 2 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 2 ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-slate-800'}`}>2</span>
                <span>{t('paymentMethodLabel', 'To\'lov Usuli')}</span>
              </button>
            </div>

            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      {t('fullNameLabel', 'F.I.SH (Ismingiz)')}
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        placeholder="Alisher Navoiy"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      {t('phoneLabel', 'Telefon raqamingiz')}
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        placeholder="+998 90 123 45 67"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    {t('addressLabel', 'Yetkazib berish manzili')}
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="Toshkent sh., Yunusobod tuman, 4-mavze, 12-uy"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    {t('commentLabel', 'Kuryer uchun izoh (ixtiyoriy)')}
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Domofon kodi 34, 2-podezd..."
                    value={formData.comment}
                    onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                    className="w-full p-3 text-xs rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-md text-xs flex items-center justify-center space-x-2 transition-all"
                >
                  <span>{t('paymentMethodLabel', 'To\'lov turini tanlash')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                  {t('paymentMethodLabel', 'Qulay to\'lov usulini tanlang:')}
                </label>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'click', name: 'Click.uz', badge: 'Avtomatik 2% keshbek', color: 'border-sky-500 text-sky-600' },
                    { id: 'payme', name: 'Payme', badge: 'Barcha kartalar', color: 'border-cyan-500 text-cyan-600' },
                    { id: 'uzcard', name: 'Uzcard / Humo', badge: 'Onlayn to\'lov', color: 'border-emerald-500 text-emerald-600' },
                    { id: 'cod', name: 'Naqd Pul / Kuryerga', badge: 'Yetkazilganda', color: 'border-amber-500 text-amber-600' }
                  ].map(method => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, paymentMethod: method.id })}
                      className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                        formData.paymentMethod === method.id
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40'
                          : 'border-gray-200 dark:border-gray-800 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-gray-900 dark:text-white">{method.name}</span>
                        {formData.paymentMethod === method.id && (
                          <Check className="w-4 h-4 text-emerald-500" />
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 mt-2">{method.badge}</span>
                    </button>
                  ))}
                </div>

                <div className="p-4 bg-gray-50 dark:bg-slate-800/60 rounded-2xl text-xs space-y-2 border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>{t('productsTotal', 'Buyurtma summasi:')}</span>
                    <span className="font-bold text-gray-900 dark:text-white">{formatPrice(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>{t('delivery', 'Yetkazib berish:')}</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{t('free', 'BEPUL')}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300"
                  >
                    {t('back', 'Orqaga')}
                  </button>

                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-600/25 text-xs transition-all"
                  >
                    {t('confirm', 'Tasdiqlash va Buyurtma berish')}
                  </button>
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

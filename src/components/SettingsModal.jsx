// src/components/SettingsModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { ModalPortal } from './ModalPortal';
import {
  X,
  User,
  Camera,
  CheckCircle2,
  Mail,
  Phone,
  Store,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';

export const SettingsModal = ({ isOpen, onClose }) => {
  const { user, updateUserProfile } = useAuth();
  const { currentStore, storeConfig, userRole } = useStore();
  const { t } = useLanguage();
  const { notifySuccess, notifyError } = useToast();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [storeName, setStoreName] = useState('');
  const [role, setRole] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      if (user.firstName !== undefined && user.lastName !== undefined && (user.firstName || user.lastName)) {
        setFirstName(user.firstName || '');
        setLastName(user.lastName || '');
      } else {
        const parts = (user.displayName || 'Azizbek Rahimov').split(' ');
        setFirstName(parts[0] || 'Azizbek');
        setLastName(parts.slice(1).join(' ') || 'Rahimov');
      }
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setStoreName(user.storeName || currentStore?.name || storeConfig?.name || '');
      setRole(user.role || '');
      setPhotoURL(user.photoURL || '');
    }
  }, [user, currentStore, storeConfig]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoURL(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const fullName = `${firstName} ${lastName}`.trim();
    const finalRole = user.role !== undefined ? user.role : null;
    try {
      if (updateUserProfile) {
        await updateUserProfile({
          firstName,
          lastName,
          displayName: fullName,
          email,
          phone,
          storeName,
          role: finalRole,
          photoURL
        });
      }
      setSaveSuccess(true);
      notifySuccess(t('saved', 'Sozlamalar saqlandi'), t('profileSavedDesc', 'Profil ma’lumotlari muvaffaqiyatli yangilandi.'));
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Profile update error:', err);
      notifyError(t('error', 'Xatolik'), err.message || t('profileSaveError', 'Profil ma’lumotlarini saqlashda xatolik yuz berdi.'));
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = () => {
    const first = firstName ? firstName[0] : 'A';
    const last = lastName ? lastName[0] : 'R';
    return (first + last).toUpperCase();
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-150"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base leading-snug">
                  {t('profileDetails', 'Profil ma’lumotlari')}
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Foydalanuvchining shaxsiy akkaunt ma’lumotlari
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto max-h-[80vh] space-y-6">
            {saveSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-xs font-bold flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{t('saved', 'Profil ma’lumotlari muvaffaqiyatli saqlandi!')}</span>
              </div>
            )}

            {/* Profile Avatar & Info Card */}
            <div className="flex items-center space-x-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="relative shrink-0">
                {photoURL ? (
                  <img
                    src={photoURL}
                    alt="Profile"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white font-black text-xl flex items-center justify-center shadow-md">
                    {getInitials()}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
                  title={t('changePhoto', 'Rasmni o‘zgartirish')}
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="font-black text-slate-900 text-sm truncate">
                  {firstName} {lastName}
                </div>
                <div className="text-xs text-slate-400 truncate mt-0.5">
                  {email}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    {t('activeAccount', 'Faol akkaunt')}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700">
                    <ShieldCheck className="w-3 h-3" />
                    {userRole || user?.role || t('roleUser', 'Foydalanuvchi')}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Form */}
            <form onSubmit={handleProfileSave} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {t('firstNameLabel', 'Ism')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {t('lastNameLabel', 'Familiya')}
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {t('emailLabel', 'Email')} *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {t('phoneLabel', 'Telefon raqam')}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {t('storeNameLabel', 'Do‘kon nomi')}
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Rol / Maqom
                </label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={userRole || user?.role || 'Foydalanuvchi'}
                    className="w-full pl-10 pr-3.5 py-3 bg-slate-100 border border-slate-200 rounded-2xl font-semibold text-slate-600 cursor-not-allowed select-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Do‘kon egasi va xodimlik rollari do‘kon boshqaruvi tizimi orqali avtomatik belgilanadi.
                </p>
              </div>

              <div className="flex items-center space-x-3 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  {t('cancel', 'Bekor qilish')}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white font-extrabold text-xs shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
                >
                  {isSaving ? t('saving', 'Saqlanmoqda...') : t('save', 'Saqlash')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

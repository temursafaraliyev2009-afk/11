// src/pages/Login.jsx
import React, { useState } from 'react';
import {
  ShoppingBag,
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  User,
  UserPlus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { BackgroundWaves } from '../components/BackgroundWaves';

export const Login = ({ onLoginSuccess }) => {
  const { loginWithEmail, registerWithEmail, loading } = useAuth();
  const { t } = useLanguage();
  const { notifySuccess, notifyError } = useToast();

  // 'login' | 'register'
  const [mode, setMode] = useState('login');

  // Form state
  const [email, setEmail] = useState(() => localStorage.getItem('savatchi_saved_email') || '');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('savatchi_remember_me') !== 'false');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const resetForm = () => {
    setPassword('');
    setDisplayName('');
    setConfirmPassword('');
    setErrorMsg(null);
    setSuccessMsg(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const switchMode = (newMode) => {
    resetForm();
    setMode(newMode);
  };

  // ─── KIRISH ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !email.includes('@')) {
      setErrorMsg(t('invalidEmailError', 'Haqiqiy email manzilini kiriting'));
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg(t('passwordTooShortError', 'Parol kamida 6 ta belgidan iborat bo‘lishi kerak!'));
      return;
    }

    try {
      const user = await loginWithEmail(email, password, rememberMe);
      notifySuccess(t('loginSuccessTitle', 'Xush kelibsiz!'), `${user.displayName} — ${t('loginSuccessDesc', 'Tizimga muvaffaqiyatli kirdingiz.')}`);
      if (onLoginSuccess) onLoginSuccess(user);
    } catch (err) {
      setErrorMsg(err.message || t('invalidCredentialsError', 'Email yoki parol noto‘g‘ri'));
    }
  };

  // ─── RO'YXATDAN O'TISH ───────────────────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!displayName || displayName.trim().length < 2) {
      setErrorMsg(t('nameRequiredError', 'Ismingizni kiriting (kamida 2 ta harf)'));
      return;
    }
    if (!email || !email.includes('@')) {
      setErrorMsg(t('invalidEmailError', 'Haqiqiy email manzilini kiriting'));
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg(t('passwordTooShortError', 'Parol kamida 6 ta belgidan iborat bo‘lishi kerak!'));
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg(t('passwordMismatchError', 'Parollar mos kelmadi!'));
      return;
    }

    try {
      const result = await registerWithEmail(email, password, displayName.trim(), rememberMe);

      if (result.needsConfirmation) {
        setSuccessMsg(
          t('confirmEmailMessage', 'Ro‘yxatdan o‘tdingiz! Email manzilingizga tasdiqlash xati yuborildi. Iltimos emailingizni tekshiring va tasdiqlang, so‘ng kiring.')
        );
      } else {
        notifySuccess(t('loginSuccessTitle', 'Xush kelibsiz!'), `${result.user?.displayName || displayName} — ${t('registerSuccessDesc', 'Ro‘yxatdan muvaffaqiyatli o‘tdingiz va kirdingiz!')}`);
        if (onLoginSuccess) onLoginSuccess(result.user);
      }
    } catch (err) {
      setErrorMsg(err.message || t('registerError', 'Ro‘yxatdan o‘tishda xatolik yuz berdi'));
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FC] text-slate-800 font-sans relative flex flex-col justify-between select-none overflow-x-hidden">
      <BackgroundWaves />

      {/* Top Navbar */}
      <header className="relative z-10 px-6 lg:px-12 py-5 flex items-center justify-between border-b border-slate-200/60 bg-white/70 backdrop-blur-md">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-500 p-0.5 shadow-lg shadow-blue-500/25 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-[#0B132B] rounded-[14px] flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none">
              {t('appName', 'Savatchi')}
            </h1>
            <p className="text-[11px] font-semibold text-slate-400 mt-1">
              {t('businessDashboard', 'Do‘kon boshqaruv paneli')}
            </p>
          </div>
        </div>


      </header>

      {/* Main Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="bg-white rounded-3xl p-7 sm:p-9 w-full max-w-md shadow-2xl border border-slate-200/80 space-y-6">

          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-500 p-0.5 shadow-lg shadow-blue-500/25 flex items-center justify-center mx-auto mb-4">
              <div className="w-full h-full bg-[#0B132B] rounded-[14px] flex items-center justify-center">
                <ShoppingBag className="w-7 h-7 text-blue-400" />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {mode === 'login'
                ? t('loginTitle', 'Tizimga kirish')
                : t('registerTitle', 'Ro‘yxatdan o‘tish')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              {mode === 'login'
                ? t('loginSubtitle', 'Do‘koningizni boshqarish uchun tizimga kiring')
                : t('registerSubtitle', 'Yangi do‘kon egasi sifatida ro‘yxatdan o‘ting')}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex p-1.5 bg-slate-100/80 rounded-2xl">
            <button
              onClick={() => switchMode('login')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{t('loginTab', 'Kirish')}</span>
            </button>
            <button
              onClick={() => switchMode('register')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{t('registerTab', 'Ro‘yxatdan o‘tish')}</span>
            </button>
          </div>

          {/* Error / Success Alerts */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-bold flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-xs font-bold flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ─── LOGIN FORM ─────────────────────────────────────────────────── */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t('email', 'Email')}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="misol@email.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrorMsg(null); }}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
                  />
                </div>
              </div>

              {/* Parol */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t('password', 'Parol')}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrorMsg(null); }}
                    className="w-full pl-11 pr-11 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Meni eslab qol checkbox */}
              <div className="flex items-center justify-between py-0.5">
                <label className="flex items-center space-x-2.5 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    id="rememberMeLogin"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer accent-blue-600 transition-all"
                  />
                  <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">
                    {t('rememberMe', 'Meni eslab qol')}
                  </span>
                </label>
              </div>

              {/* Kirish tugmasi */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-lg shadow-blue-600/25 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-60 active:scale-[0.98]"
              >
                {loading ? (
                  <span>{t('loading', 'Yuklanmoqda...')}</span>
                ) : (
                  <>
                    <span>{t('btnLogin', 'Kirish')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Register'ga o'tish */}
              <p className="text-center text-xs text-slate-400 font-medium">
                {t('noAccount', 'Hisobingiz yo‘qmi?')}{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  {t('registerLink', 'Ro‘yxatdan o‘ting')}
                </button>
              </p>
            </form>
          )}

          {/* ─── REGISTER FORM ──────────────────────────────────────────────── */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Ism */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t('fullName', 'Ismingiz')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder={t('fullNamePlaceholder', 'To‘liq ismingiz')}
                    value={displayName}
                    onChange={(e) => { setDisplayName(e.target.value); setErrorMsg(null); }}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t('email', 'Email')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="misol@email.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrorMsg(null); }}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
                  />
                </div>
              </div>

              {/* Parol */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t('password', 'Parol')} <span className="text-rose-500">*</span>
                  <span className="text-slate-400 font-normal ml-1">{t('passwordMinChars', '(kamida 6 ta belgi)')}</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrorMsg(null); }}
                    className="w-full pl-11 pr-11 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Parolni tasdiqlash */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t('confirmPassword', 'Parolni tasdiqlang')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setErrorMsg(null); }}
                    className={`w-full pl-11 pr-11 py-3.5 bg-slate-50 border rounded-2xl font-semibold text-sm text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                      confirmPassword && password !== confirmPassword
                        ? 'border-rose-300 focus:ring-rose-500/20'
                        : confirmPassword && password === confirmPassword
                        ? 'border-emerald-300 focus:ring-emerald-500/20'
                        : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  {confirmPassword && (
                    <div className={`absolute right-11 top-1/2 -translate-y-1/2 ${
                      password === confirmPassword ? 'text-emerald-500' : 'text-rose-400'
                    }`}>
                      {password === confirmPassword
                        ? <CheckCircle2 className="w-4 h-4" />
                        : <AlertCircle className="w-4 h-4" />}
                    </div>
                  )}
                </div>
              </div>

              {/* Meni eslab qol checkbox */}
              <div className="flex items-center justify-between py-0.5">
                <label className="flex items-center space-x-2.5 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    id="rememberMeRegister"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer accent-blue-600 transition-all"
                  />
                  <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">
                    {t('rememberMe', 'Meni eslab qol')}
                  </span>
                </label>
              </div>

              {/* Ro'yxatdan o'tish tugmasi */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-60 active:scale-[0.98]"
              >
                {loading ? (
                  <span>{t('loading', 'Yuklanmoqda...')}</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{t('btnRegister', 'Hisob yaratish')}</span>
                  </>
                )}
              </button>

              {/* Login'ga o'tish */}
              <p className="text-center text-xs text-slate-400 font-medium">
                {t('hasAccount', 'Allaqachon hisobingiz bormi?')}{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  {t('loginLink', 'Kirish')}
                </button>
              </p>
            </form>
          )}

          {/* Supabase Badge */}
          <div className="flex items-center justify-center space-x-2 pt-2 border-t border-slate-100">
            <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.9 1.036c-.015-.986-1.26-1.41-1.874-.637L.764 12.05C.161 12.887.746 14 1.79 14h8.018l.174 8.964c.015.986 1.26 1.41 1.874.637l9.262-11.651c.603-.837.018-1.95-1.026-1.95h-8.018L11.9 1.036z"/>
            </svg>
            <span className="text-[10px] text-slate-400 font-bold">Powered by Supabase</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-4 text-xs text-slate-400 font-medium">
        {t('copyright', '© 2025 Savatchi · Barcha huquqlar himoyalangan')}
      </footer>
    </div>
  );
};

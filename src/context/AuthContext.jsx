// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { registerSystemAccount } from '../services/accountService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Supabase session'ni boshlang'ich yuklash
  useEffect(() => {
    // Joriy session'ni olish
    supabase.auth.getSession().then(({ data: { session } }) => {
      const rememberMe = localStorage.getItem('savatchi_remember_me') !== 'false';
      const sessionActive = sessionStorage.getItem('savatchi_session_active');

      // Agar "Meni eslab qol" belgilanmagan bo'lsa va yangi brauzer sessiyasi ochilgan bo'lsa
      if (!rememberMe && !sessionActive && session) {
        supabase.auth.signOut().then(() => {
          setUser(null);
          setLoading(false);
        });
        return;
      }

      if (session?.user) {
        sessionStorage.setItem('savatchi_session_active', 'true');
        setUser(formatUser(session.user));
      }
      setLoading(false);
    });

    // Auth holati o'zgarganda eshitish
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          sessionStorage.setItem('savatchi_session_active', 'true');
          setUser(formatUser(session.user));
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Listen to role changes across the system
  useEffect(() => {
    const handleRoleChanged = (e) => {
      const { identifier, role } = e.detail || {};
      if (!identifier) return;
      const target = String(identifier).trim().toLowerCase();
      setUser(prev => {
        if (!prev) return null;
        const uEmail = (prev.email || '').trim().toLowerCase();
        const uId = String(prev.id || prev.uid || '').toLowerCase();
        if (uEmail === target || uId === target) {
          return { ...prev, role };
        }
        return prev;
      });
    };

    window.addEventListener('savatchi_user_role_changed', handleRoleChanged);
    return () => window.removeEventListener('savatchi_user_role_changed', handleRoleChanged);
  }, []);

  // Local profile persistence helpers
  const getStoredProfile = (userId, email) => {
    try {
      if (userId) {
        const byId = localStorage.getItem(`savatchi_profile_${userId}`);
        if (byId) return JSON.parse(byId);
      }
      if (email) {
        const byEmail = localStorage.getItem(`savatchi_profile_${email}`);
        if (byEmail) return JSON.parse(byEmail);
      }
    } catch (e) {}
    return null;
  };

  const saveStoredProfile = (userId, email, profileData) => {
    try {
      if (userId) {
        localStorage.setItem(`savatchi_profile_${userId}`, JSON.stringify(profileData));
      }
      if (email) {
        localStorage.setItem(`savatchi_profile_${email}`, JSON.stringify(profileData));
      }
    } catch (e) {}
  };

  // Supabase User ob'ektini ilova formatiga o'tkazish
  const formatUser = (supabaseUser) => {
    const meta = supabaseUser.user_metadata || {};
    const local = getStoredProfile(supabaseUser.id, supabaseUser.email || meta.email) || {};

    const metaName = meta.display_name || meta.full_name ||
      (meta.first_name || meta.last_name ? `${meta.first_name || ''} ${meta.last_name || ''}`.trim() : '');
    const localName = (local.displayName && local.displayName !== 'Foydalanuvchi') ? local.displayName : null;
    const realFirstName = (local.firstName !== undefined && local.firstName !== 'Foydalanuvchi') ? local.firstName : (meta.first_name || '');
    const realLastName = local.lastName !== undefined ? local.lastName : (meta.last_name || '');
    const fallbackName = (realFirstName || realLastName ? `${realFirstName} ${realLastName}`.trim() : '') ||
      (supabaseUser.email ? supabaseUser.email.split('@')[0] : 'Foydalanuvchi');
    const displayName = localName || metaName || fallbackName;

    const u = {
      uid: supabaseUser.id,
      sub: supabaseUser.id,
      id: supabaseUser.id,
      email: local.email || meta.email || supabaseUser.email || '',
      firstName: realFirstName,
      lastName: realLastName,
      displayName,
      photoURL: local.photoURL !== undefined ? local.photoURL : (meta.avatar_url || null),
      phone: local.phone !== undefined ? local.phone : (meta.phone || ''),
      storeName: local.storeName !== undefined ? local.storeName : (meta.store_name || ''),
      role: local.role !== undefined && local.role !== null ? local.role : (meta.role !== undefined && meta.role !== null ? meta.role : 'Foydalanuvchi'),
      loginType: 'email',
      isProfileComplete: true,
      loginTime: new Date().toISOString()
    };

    try {
      registerSystemAccount(u);
    } catch (e) {}

    return u;
  };

  /**
   * Email va parol bilan KIRISH (sign in)
   */
  const loginWithEmail = async (email, password, rememberMe = true) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      if (error) {
        // Xatolik xabarlarini o'zbekchaga tarjima qilish
        if (error.message.includes('Invalid login credentials')) {
          throw new Error("Email yoki parol noto'g'ri!");
        }
        if (error.message.includes('Email not confirmed')) {
          throw new Error("Email tasdiqlanmagan. Iltimos, Supabase dashboard'da email confirmationni o'chiring.");
        }
        throw new Error(error.message);
      }

      // "Meni eslab qol" holatini saqlash (parol HECH QACHON saqlanmaydi)
      if (rememberMe) {
        localStorage.setItem('savatchi_remember_me', 'true');
        localStorage.setItem('savatchi_saved_email', email.trim().toLowerCase());
      } else {
        localStorage.setItem('savatchi_remember_me', 'false');
        localStorage.removeItem('savatchi_saved_email');
      }
      sessionStorage.setItem('savatchi_session_active', 'true');

      const formattedUser = formatUser(data.user);
      setUser(formattedUser);
      return formattedUser;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Email va parol bilan RO'YXATDAN O'TISH (sign up)
   * Email tasdiqlashsiz — to'g'ridan-to'g'ri tizimga kirish
   */
  const registerWithEmail = async (email, password, displayName = '', rememberMe = true) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            display_name: displayName || email.split('@')[0],
            role: 'Foydalanuvchi'
          },
          // Email tasdiqsiz ro'yxatdan o'tish
          emailRedirectTo: undefined
        }
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          throw new Error("Bu email allaqachon ro'yxatdan o'tgan. Kirish sahifasiga o'ting.");
        }
        throw new Error(error.message);
      }

      if (rememberMe) {
        localStorage.setItem('savatchi_remember_me', 'true');
        localStorage.setItem('savatchi_saved_email', email.trim().toLowerCase());
      } else {
        localStorage.setItem('savatchi_remember_me', 'false');
        localStorage.removeItem('savatchi_saved_email');
      }
      sessionStorage.setItem('savatchi_session_active', 'true');

      // Agar session darhol berilsa (email confirm o'chirilgan bo'lsa)
      if (data.user && data.session) {
        const formattedUser = formatUser(data.user);
        setUser(formattedUser);
        return { user: formattedUser, needsConfirmation: false };
      }

      // Agar session berilmasa (email confirm kerak bo'lsa)
      if (data.user && !data.session) {
        return { user: null, needsConfirmation: true };
      }

      const formattedUser = formatUser(data.user);
      setUser(formattedUser);
      return { user: formattedUser, needsConfirmation: false };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Chiqish
   */
  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('savatchi_remember_me');
      localStorage.removeItem('savatchi_saved_email');
      sessionStorage.removeItem('savatchi_session_active');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Foydalanuvchi profilini yangilash
   */
  const updateUserProfile = async (updates) => {
    const currentUserId = user?.id || 'current_user';
    const currentUserEmail = user?.email || '';

    // Akkauntning mavjud shaxsiy ma'lumotlarini qat'iy saqlab qolamiz (Talab 3 va 4)
    const existingFirstName = user?.firstName || '';
    const existingLastName = user?.lastName || '';
    const existingDisplayName = user?.displayName || `${existingFirstName} ${existingLastName}`.trim() || (currentUserEmail ? currentUserEmail.split('@')[0] : '');

    const firstName = updates.firstName !== undefined
      ? updates.firstName
      : (updates.displayName && updates.displayName !== 'Foydalanuvchi'
          ? updates.displayName.split(' ')[0]
          : existingFirstName);

    const lastName = updates.lastName !== undefined
      ? updates.lastName
      : (updates.displayName && updates.displayName !== 'Foydalanuvchi'
          ? updates.displayName.split(' ').slice(1).join(' ')
          : existingLastName);

    const displayName = (updates.displayName !== undefined && updates.displayName !== 'Foydalanuvchi')
      ? updates.displayName
      : (existingDisplayName || `${firstName} ${lastName}`.trim() || (currentUserEmail ? currentUserEmail.split('@')[0] : 'Foydalanuvchi'));

    const email = updates.email || currentUserEmail || '';
    const phone = updates.phone !== undefined ? updates.phone : (user?.phone || '');
    const photoURL = updates.photoURL !== undefined ? updates.photoURL : (user?.photoURL || null);
    const storeName = updates.storeName !== undefined ? updates.storeName : (user?.storeName || '');
    const role = updates.role !== undefined && updates.role !== null ? updates.role : (user?.role || 'Foydalanuvchi');

    const profileData = {
      firstName,
      lastName,
      displayName,
      email,
      phone,
      photoURL,
      storeName,
      role
    };

    // 1. Local persistence qatlamiga yozish (offline, F5 va doimiy saqlanish uchun)
    saveStoredProfile(currentUserId, currentUserEmail || email, profileData);
    if (email && email !== currentUserEmail) {
      saveStoredProfile(currentUserId, email, profileData);
    }

    // Holatni zudlik bilan yangilash (Header va UI darhol aks etishi uchun)
    const formatted = {
      ...(user || {}),
      ...profileData,
      id: currentUserId,
      uid: currentUserId
    };
    try {
      registerSystemAccount(formatted);
    } catch (e) {}
    setUser(formatted);

    // 2. Agar backend (Supabase) mavjud bo'lsa, backendga sinxronlashtirish
    try {
      const metadataUpdates = {
        first_name: firstName,
        last_name: lastName,
        display_name: displayName,
        full_name: displayName,
        email: email,
        avatar_url: photoURL,
        phone: phone,
        store_name: storeName,
        role: role
      };

      const { data, error } = await supabase.auth.updateUser({
        data: metadataUpdates
      });
      if (error) {
        console.warn('Supabase profile update warning:', error);
      } else if (data?.user) {
        const backendFormatted = formatUser(data.user);
        setUser(backendFormatted);
        return backendFormatted;
      }
    } catch (backendError) {
      console.warn('Backend profile update note:', backendError);
    }

    return formatted;
  };

  // Eski tizim bilan muvofiqlik uchun stub funksiyalar
  const loginWithGoogle = async () => {
    throw new Error('Google login hozirda mavjud emas. Email/Parol bilan kiring.');
  };
  const loginWithGoogleGIS = loginWithGoogle;
  const sendPhoneOTP = async () => ({ success: false, message: 'Telefon login mavjud emas' });
  const loginWithPhone = async () => { throw new Error('Telefon login mavjud emas'); };
  const completeUserProfile = async () => {};
  const checkUserExistsBySub = () => null;
  const switchAccount = () => {};
  const isGoogleConfigured = () => false;
  const addAccount = () => {};

  return (
    <AuthContext.Provider
      value={{
        user,
        accounts,
        isAuthenticated: !!user,
        loading,
        isGoogleConfigured,
        // Asosiy auth funksiyalari
        loginWithEmail,
        registerWithEmail,
        logout,
        updateUserProfile,
        // Eski tizim bilan muvofiqlik
        login: loginWithEmail,
        loginWithGoogle,
        loginWithGoogleGIS,
        loginWithPhone,
        sendPhoneOTP,
        completeUserProfile,
        checkUserExistsBySub,
        switchAccount,
        addAccount
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

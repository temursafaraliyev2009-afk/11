// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { registerSystemAccount, syncProfileToCloud, findAccountByIdentifier } from '../services/accountService';

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
        setLoading(false);
        return;
      }

      // Supabase session yo'q bo'lsa, mahalliy fallback: "Meni eslab qol" va saqlangan email orqali tiklash
      if (rememberMe) {
        const savedEmail = localStorage.getItem('savatchi_saved_email');
        if (savedEmail) {
          try {
            const localAcc = findAccountByIdentifier(savedEmail);
            if (localAcc) {
              const restoredUser = {
                id: localAcc.id || localAcc.uid,
                uid: localAcc.uid || localAcc.id,
                email: localAcc.email,
                displayName: localAcc.displayName,
                firstName: localAcc.firstName || '',
                lastName: localAcc.lastName || '',
                role: localAcc.role || 'Foydalanuvchi',
                loginType: 'email',
                isProfileComplete: true,
                loginTime: new Date().toISOString()
              };
              sessionStorage.setItem('savatchi_session_active', 'true');
              setUser(restoredUser);
              setLoading(false);
              return;
            }
          } catch (e) { }
        }
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
    } catch (e) { }
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
    } catch (e) { }
  };

  // Supabase User ob'ektini ilova formatiga o'tkazish
  const formatUser = (supabaseUser) => {
    const meta = supabaseUser.user_metadata || {};
    const userEmail = (meta.email || supabaseUser.email || '').trim().toLowerCase();
    const userId = supabaseUser.id;
    const local = getStoredProfile(userId, userEmail) || {};

    const metaName = meta.display_name || meta.full_name ||
      (meta.first_name || meta.last_name ? `${meta.first_name || ''} ${meta.last_name || ''}`.trim() : '');
    const localName = (local.displayName && local.displayName !== 'Foydalanuvchi') ? local.displayName : null;
    const realFirstName = (local.firstName !== undefined && local.firstName !== 'Foydalanuvchi') ? local.firstName : (meta.first_name || '');
    const realLastName = local.lastName !== undefined ? local.lastName : (meta.last_name || '');
    const fallbackName = (realFirstName || realLastName ? `${realFirstName} ${realLastName}`.trim() : '') ||
      (userEmail ? userEmail.split('@')[0] : 'Foydalanuvchi');
    const displayName = localName || metaName || fallbackName;

    // Rolni barcha mavjud manbalardan qat'iy tekshirish (Talab 1, 2)
    let resolvedRole = local.role !== undefined && local.role !== null ? local.role : null;
    if (!resolvedRole || resolvedRole === 'Foydalanuvchi') {
      const registered = findAccountByIdentifier(userEmail) || findAccountByIdentifier(userId);
      if (registered?.role && registered.role !== 'Foydalanuvchi') {
        resolvedRole = registered.role;
      }
    }
    if (!resolvedRole || resolvedRole === 'Foydalanuvchi') {
      try {
        const rawMsgs = localStorage.getItem('savatchi_mail_messages');
        if (rawMsgs) {
          const msgs = JSON.parse(rawMsgs);
          if (Array.isArray(msgs)) {
            const hasAccepted = msgs.some(m =>
              m.type === 'staff_invitation' &&
              m.status === 'Qabul qilindi' &&
              (
                (m.toUser?.email && m.toUser.email.trim().toLowerCase() === userEmail) ||
                (userId && (m.toUser?.id === userId || m.toUser?.uid === userId))
              )
            );
            if (hasAccepted) {
              resolvedRole = 'Xodim';
            }
          }
        }
      } catch (e) { }
    }
    if (!resolvedRole || resolvedRole === 'Foydalanuvchi') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('savatchi_employees_')) {
            const rawEmps = localStorage.getItem(key);
            if (rawEmps) {
              const empList = JSON.parse(rawEmps);
              if (Array.isArray(empList)) {
                const foundEmp = empList.find(e =>
                  e.status === 'Faol' && (
                    (userId && (e.accountId === userId || e.userId === userId || e.id === userId)) ||
                    (userEmail && e.email && e.email.trim().toLowerCase() === userEmail)
                  )
                );
                if (foundEmp) {
                  resolvedRole = foundEmp.role || 'Xodim';
                  break;
                }
              }
            }
          }
        }
      } catch (e) { }
    }
    if (!resolvedRole) {
      resolvedRole = meta.role || 'Foydalanuvchi';
    }

    const u = {
      uid: userId,
      sub: userId,
      id: userId,
      email: local.email || userEmail,
      firstName: realFirstName,
      lastName: realLastName,
      displayName,
      photoURL: local.photoURL !== undefined ? local.photoURL : (meta.avatar_url || null),
      phone: local.phone !== undefined ? local.phone : (meta.phone || ''),
      storeName: local.storeName !== undefined ? local.storeName : (meta.store_name || ''),
      role: resolvedRole,
      loginType: 'email',
      isProfileComplete: true,
      loginTime: new Date().toISOString()
    };

    // Profil xotirasini yangilab qo'yish
    saveStoredProfile(userId, userEmail, u);

    try {
      registerSystemAccount(u);
    } catch (e) { }

    // Cloud sinxronizatsiya (fon rejimida, UI'ni bloklamasdan)
    try {
      syncProfileToCloud(u).catch(() => { });
    } catch (e) { }

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
        // Fallback agar mahalliy tizimda ro'yxatdan o'tgan akkaunt mavjud bo'lsa
        const localAcc = findAccountByIdentifier(email);
        if (localAcc) {
          const fallbackUser = {
            id: localAcc.id || localAcc.uid,
            uid: localAcc.uid || localAcc.id,
            email: localAcc.email,
            displayName: localAcc.displayName,
            firstName: localAcc.firstName || '',
            lastName: localAcc.lastName || '',
            role: localAcc.role || 'Foydalanuvchi',
            loginType: 'email',
            isProfileComplete: true,
            loginTime: new Date().toISOString()
          };
          if (rememberMe) {
            localStorage.setItem('savatchi_remember_me', 'true');
            localStorage.setItem('savatchi_saved_email', email.trim().toLowerCase());
          }
          sessionStorage.setItem('savatchi_session_active', 'true');
          setUser(fallbackUser);
          return fallbackUser;
        }

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
        // Resilient fallback agar Supabase rate-limiting yoki tarmoq xatosi bo'lsa
        const userEmail = email.trim().toLowerCase();
        const userDisplayName = displayName || userEmail.split('@')[0] || 'Foydalanuvchi';
        const fallbackId = 'usr-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
        const newAcc = {
          id: fallbackId,
          uid: fallbackId,
          email: userEmail,
          displayName: userDisplayName,
          firstName: userDisplayName.split(' ')[0] || '',
          lastName: userDisplayName.split(' ').slice(1).join(' ') || '',
          role: 'Foydalanuvchi',
          createdAt: new Date().toISOString()
        };
        registerSystemAccount(newAcc);
        saveStoredProfile(fallbackId, userEmail, newAcc);
        if (rememberMe) {
          localStorage.setItem('savatchi_remember_me', 'true');
          localStorage.setItem('savatchi_saved_email', userEmail);
        }
        sessionStorage.setItem('savatchi_session_active', 'true');
        setUser(newAcc);
        return { user: newAcc, needsConfirmation: false };
      }

      if (rememberMe) {
        localStorage.setItem('savatchi_remember_me', 'true');
        localStorage.setItem('savatchi_saved_email', email.trim().toLowerCase());
      } else {
        localStorage.setItem('savatchi_remember_me', 'false');
        localStorage.removeItem('savatchi_saved_email');
      }
      sessionStorage.setItem('savatchi_session_active', 'true');

      // Yangi ro'yxatdan o'tgan foydalanuvchini darhol tizim akkauntlari ro'yxatiga qayd etish
      if (data.user) {
        try {
          const userEmail = (email || data.user.email || '').trim().toLowerCase();
          const userDisplayName = displayName || userEmail.split('@')[0] || 'Foydalanuvchi';
          const newAcc = {
            id: data.user.id,
            uid: data.user.id,
            email: userEmail,
            displayName: userDisplayName,
            firstName: userDisplayName.split(' ')[0] || '',
            lastName: userDisplayName.split(' ').slice(1).join(' ') || '',
            role: 'Foydalanuvchi',
            createdAt: new Date().toISOString()
          };
          registerSystemAccount(newAcc);
          saveStoredProfile(data.user.id, userEmail, newAcc);
        } catch (e) { }
      }

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
      try {
        sessionStorage.clear();
      } catch (e) { }
      window.dispatchEvent(new CustomEvent('savatchi_user_logged_out'));
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
    } catch (e) { }
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
  const completeUserProfile = async () => { };
  const checkUserExistsBySub = () => null;
  const switchAccount = () => { };
  const isGoogleConfigured = () => false;
  const addAccount = () => { };

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

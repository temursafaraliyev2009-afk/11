// src/routes/ProtectedRoute.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStore, getActiveStoreKey, loadUserStoresFromStorage } from '../context/StoreContext';

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#F3F6FD]">
    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

export const ProtectedRoute = ({ children, requireStore = true }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const { selectedStoreId } = useStore();
  // Track whether we have waited at least one render cycle after auth resolved
  const [authSettled, setAuthSettled] = useState(false);

  useEffect(() => {
    if (!loading) {
      // After auth resolves, wait two animation frames so StoreContext.useEffect([userId])
      // has time to run and set selectedStoreId from localStorage.
      let raf1 = requestAnimationFrame(() => {
        requestAnimationFrame(() => setAuthSettled(true));
      });
      return () => cancelAnimationFrame(raf1);
    } else {
      setAuthSettled(false);
    }
  }, [loading, isAuthenticated]);

  // Show spinner while auth is loading OR we haven't yet waited for StoreContext to sync
  if (loading || !authSettled) {
    return <Spinner />;
  }

  // Not logged in -> go to /login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but has not selected a store
  if (requireStore && !selectedStoreId) {
    // Last-resort fallback: read directly from localStorage in case StoreContext state
    // is one render cycle behind (race condition between AuthContext resolve and StoreContext sync).
    try {
      const userId = user?.id || user?.uid;
      const userEmail = user?.email;
      if (userId) {
        const storedId = localStorage.getItem(getActiveStoreKey(userId));
        if (storedId) {
          // We know a storeId exists — StoreContext will catch up on the next render.
          // Show a spinner to hold the current route until it does.
          return <Spinner />;
        }
      }
      // Agar foydalanuvchida biriktirilgan do'konlar (shu jumladan xodim do'koni) mavjud bo'lsa
      if (userId || userEmail) {
        const availableStores = loadUserStoresFromStorage(userId, userEmail);
        if (availableStores && availableStores.length > 0) {
          return <Spinner />;
        }
      }
    } catch (e) {}
    return <Navigate to="/select-store" replace />;
  }

  return children;
};

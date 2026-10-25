// src/routes/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';

export const ProtectedRoute = ({ children, requireStore = true }) => {
  const { isAuthenticated, loading } = useAuth();
  const { selectedStoreId } = useStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F6FD]">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in -> go to /login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but has not selected a store -> go to /select-store
  if (requireStore && !selectedStoreId) {
    return <Navigate to="/select-store" replace />;
  }

  return children;
};

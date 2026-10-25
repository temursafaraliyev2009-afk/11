// src/pages/SellerDashboard.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { Dashboard } from './Dashboard';

export const SellerDashboard = ({ setActiveTab }) => {
  const navigate = useNavigate();
  const { isDebtsAllowed, isRentalAllowed, isInstallmentAllowed } = useStore();

  const handleTabChange = (tab) => {
    if (tab === 'debtors' && !isDebtsAllowed) {
      return;
    }
    if (tab === 'rentals' && !isRentalAllowed) {
      return;
    }
    if (tab === 'installments' && !isInstallmentAllowed) {
      return;
    }
    if (setActiveTab) {
      setActiveTab(tab);
    } else {
      const routeMap = {
        sales: '/store/seller/sales',
        inventory: '/store/seller/inventory',
        debtors: '/store/seller/debtors',
        rentals: '/store/seller/rentals',
        installments: '/store/seller/installments',
        reports: '/store/seller/reports',
        orders: '/store/orders',
        staff: '/store/seller/staff',
        history: '/store/seller/history'
      };
      if (routeMap[tab]) {
        navigate(routeMap[tab]);
      }
    }
  };

  return <Dashboard setActiveTab={handleTabChange} />;
};

export default SellerDashboard;

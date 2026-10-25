// src/App.jsx
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useStore } from './context/StoreContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { Sidebar } from './components/Sidebar';
import { DashboardHeader } from './components/DashboardHeader';
import { BackgroundWaves } from './components/BackgroundWaves';

// Admin Pages
import { Login } from './pages/Login';
import { StoreTypeSelection } from './pages/StoreTypeSelection';
import { Dashboard } from './pages/Dashboard';
import { Sales } from './pages/Sales';
import { Inventory } from './pages/Inventory';
import { Debts } from './pages/Debts';
import { Reports } from './pages/Reports';
import { Orders } from './pages/Orders';
import { Employees } from './pages/Employees';
import { ActivityHistory } from './pages/ActivityHistory';
import { Rentals } from './pages/Rentals';
import { Installments } from './pages/Installments';

// Storefront Pages
import { HomePage } from './pages/HomePage';
import { OrdersPage } from './pages/OrdersPage';
import { WishlistPage } from './pages/WishlistPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SellerDashboard } from './pages/SellerDashboard';
import { SalesPage } from './pages/SalesPage';
import { InventoryPage } from './pages/InventoryPage';
import { StaffPage } from './pages/StaffPage';
import { DebtorsPage } from './pages/DebtorsPage';
import { ReportsPage } from './pages/ReportsPage';
import { ActivityHistoryPage } from './pages/ActivityHistoryPage';
import { RentalsPage } from './pages/RentalsPage';
import { InstallmentsPage } from './pages/InstallmentsPage';

// Storefront Components
import { Header } from './components/Header';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { ToastContainer } from './components/Toast';
import { ProductModal } from './components/ProductModal';

// ─── Admin Dashboard Layout ───────────────────────────────────────────────────
function DashboardLayout() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { isEmployee, isRentalAllowed, isDebtsAllowed, isInstallmentAllowed } = useStore();

  // If an employee tries to access a restricted tab, automatically reset to dashboard
  React.useEffect(() => {
    if (isEmployee && ['reports', 'staff', 'history'].includes(activeTab)) {
      setActiveTab('dashboard');
    }
    // If rentals tab is active but current store type does not allow rental, reset to dashboard
    if (activeTab === 'rentals' && !isRentalAllowed) {
      setActiveTab('dashboard');
    }
    // If debtors tab is active but current store type does not allow debts, reset to dashboard
    if (activeTab === 'debtors' && !isDebtsAllowed) {
      setActiveTab('dashboard');
    }
    // If installments tab is active but current store type does not allow installments, reset to dashboard
    if (activeTab === 'installments' && !isInstallmentAllowed) {
      setActiveTab('dashboard');
    }
  }, [isEmployee, activeTab, isRentalAllowed, isDebtsAllowed, isInstallmentAllowed]);

  return (
    <div className="flex h-screen bg-[#F3F6FD] text-slate-800 font-sans relative overflow-hidden">
      <BackgroundWaves />
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={mobileMenuOpen}
        setIsOpen={setMobileMenuOpen}
      />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative z-10">
        <div className="sticky top-0 z-30 bg-[#F3F6FD]/90 backdrop-blur-md border-b border-slate-200/60 shadow-xs">
          <DashboardHeader
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
            onSelectStoreTypeClick={() => navigate('/select-store')}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </div>
        <main className="flex-1 px-3 sm:px-6 lg:px-8 py-5 overflow-y-auto overflow-x-hidden min-h-0 min-w-0 max-w-full scroll-smooth">
          {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
          {activeTab === 'sales' && <Sales />}
          {activeTab === 'inventory' && <Inventory />}
          {activeTab === 'debtors' && (isDebtsAllowed ? <Debts /> : <Dashboard setActiveTab={setActiveTab} />)}
          {activeTab === 'rentals' && (isRentalAllowed ? <Rentals setActiveTab={setActiveTab} /> : <Dashboard setActiveTab={setActiveTab} />)}
          {activeTab === 'installments' && (isInstallmentAllowed ? <Installments setActiveTab={setActiveTab} /> : <Dashboard setActiveTab={setActiveTab} />)}
          {activeTab === 'reports' && (!isEmployee ? <Reports /> : <Dashboard setActiveTab={setActiveTab} />)}
          {activeTab === 'orders' && <Orders />}
          {activeTab === 'staff' && (!isEmployee ? <Employees /> : <Dashboard setActiveTab={setActiveTab} />)}
          {activeTab === 'history' && (!isEmployee ? <ActivityHistory /> : <Dashboard setActiveTab={setActiveTab} />)}
        </main>
      </div>
    </div>
  );
}

// ─── Storefront Layout ────────────────────────────────────────────────────────
function StoreFrontLayout() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { isEmployee, isRentalAllowed, isDebtsAllowed, isInstallmentAllowed } = useStore();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSelectCategory={setSelectedCategory}
      />
      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              searchQuery={searchQuery}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          }
        />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/seller" element={<SellerDashboard />} />
        <Route path="/seller/sales" element={<SalesPage />} />
        <Route path="/seller/inventory" element={<InventoryPage />} />
        <Route path="/seller/staff" element={!isEmployee ? <StaffPage /> : <Navigate to="/store/seller" replace />} />
        <Route path="/seller/debtors" element={isDebtsAllowed ? <DebtorsPage /> : <Navigate to="/store/seller" replace />} />
        <Route path="/seller/rentals" element={isRentalAllowed ? <RentalsPage /> : <Navigate to="/store/seller" replace />} />
        <Route path="/seller/installments" element={isInstallmentAllowed ? <InstallmentsPage /> : <Navigate to="/store/seller" replace />} />
        <Route path="/seller/reports" element={!isEmployee ? <ReportsPage /> : <Navigate to="/store/seller" replace />} />
        <Route path="/seller/history" element={!isEmployee ? <ActivityHistoryPage /> : <Navigate to="/store/seller" replace />} />
        <Route path="*" element={<Navigate to="/store/" replace />} />
      </Routes>
      {/* Global Overlays */}
      <CartDrawer />
      <CheckoutModal />
      <ProductModal />
      <ToastContainer />
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Storefront: public, no auth required */}
        <Route path="/store/*" element={<StoreFrontLayout />} />

        {/* Admin: Login */}
        <Route path="/login" element={<LoginPageWrapper />} />

        {/* Admin: Store Type Selection */}
        <Route
          path="/select-store"
          element={
            <ProtectedRoute requireStore={false}>
              <StoreSelectionWrapper />
            </ProtectedRoute>
          }
        />

        {/* Admin: Main Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requireStore={true}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}

function LoginPageWrapper() {
  const { isAuthenticated } = useAuth();
  const { selectedStoreId } = useStore();
  const navigate = useNavigate();

  if (isAuthenticated) {
    if (!selectedStoreId) return <Navigate to="/select-store" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <Login onLoginSuccess={() => navigate('/select-store')} />;
}

function StoreSelectionWrapper() {
  const navigate = useNavigate();
  return <StoreTypeSelection onSelectComplete={() => navigate('/dashboard')} />;
}

function RootRedirect() {
  const { isAuthenticated } = useAuth();
  const { selectedStoreId } = useStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!selectedStoreId) return <Navigate to="/select-store" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default App;




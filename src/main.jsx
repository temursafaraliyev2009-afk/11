// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './context/AuthContext.jsx';
import { StoreProvider } from './context/StoreContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { CartProvider } from './context/CartContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <StoreProvider>
            <ToastProvider>
              <CartProvider>
                <App />
              </CartProvider>
            </ToastProvider>
          </StoreProvider>
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  </React.StrictMode>
);


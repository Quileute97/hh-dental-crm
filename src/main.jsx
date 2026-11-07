import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { isSupabaseConfigured } from './lib/supabase';
import MissingConfigScreen from './components/Common/MissingConfigScreen';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isSupabaseConfigured ? (
      <AuthProvider>
        <App />
      </AuthProvider>
    ) : (
      <MissingConfigScreen />
    )}
  </React.StrictMode>
);

import SupabaseManager from '../services/SupabaseManager';
import { loadUserData } from './DataUtils';

// Handle user login
export const handleLogin = async (userData, setUser, setData) => {
  setUser(userData);
  await loadUserData(setData);
};

// Handle user logout
export const handleLogout = async (setUser, setData) => {
  await SupabaseManager.logout();
  setUser(null);
  setData({
    properties: [],
    loans: [],
    transactions: [],
    expenses: [],
    rentals: [],
    agents: [],
    settings: {
      financialYearStart: '07-01',
      notifications: []
    }
  });
};
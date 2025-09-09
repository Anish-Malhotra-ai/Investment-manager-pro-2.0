import PocketbaseManager from '../services/PocketbaseManager';
import { loadUserData } from './DataUtils';

// Handle user login
export const handleLogin = async (userData, setUser, setData) => {
  setUser(userData);
  await loadUserData(setData);
};

// Handle user logout
export const handleLogout = async (setUser, setData) => {
  await PocketbaseManager.logout();
  setUser(null);
  setData({
    properties: [],
    loans: [],
    transactions: [],
    settings: {
      financialYearStart: '07-01',
      notifications: []
    }
  });
};
import SupabaseManager from '../services/SupabaseManager';
import { loadUserData } from './DataUtils';

// Handle user login
export const handleLogin = async (userData, setUser, setData) => {
  try {
    // Get user profile to check isActive status
    const profileResult = await SupabaseManager.getUserProfile(userData.id);
    
    if (profileResult.success) {
      // Add profile data to user object
      const userWithProfile = {
        ...userData,
        profile: profileResult.profile,
        isActive: profileResult.profile.is_active
      };
      setUser(userWithProfile);
    } else {
      // If profile fetch fails, still set user but mark as inactive for safety
      const userWithProfile = {
        ...userData,
        profile: null,
        isActive: false
      };
      setUser(userWithProfile);
      console.warn('Failed to load user profile:', profileResult.error);
    }
    
    await loadUserData(setData);
  } catch (error) {
    console.error('Error during login:', error);
    // Fallback: set user as inactive if there's an error
    const userWithProfile = {
      ...userData,
      profile: null,
      isActive: false
    };
    setUser(userWithProfile);
  }
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

// Check if user is active and can perform actions
export const isUserActive = (user) => {
  return user && user.isActive === true;
};

// Check if user can perform create/edit/delete actions
export const canUserPerformActions = (user) => {
  return isUserActive(user);
};

// Get user active status message
export const getUserStatusMessage = (user) => {
  if (!user) return 'Not logged in';
  if (!isUserActive(user)) return 'Account is inactive - read-only mode';
  return 'Account is active';
};
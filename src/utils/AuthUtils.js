import SupabaseManager from '../services/SupabaseManager';
import { loadUserData } from './DataUtils';

// Plan tiers
const VALID_PLANS = ['free', 'monthly', 'yearly', 'lifetime'];
const FREE_TRIAL_DAYS = 15;

export const getUserPlan = (user) => {
  const plan = user?.profile?.plan || 'free';
  return VALID_PLANS.includes(plan) ? plan : 'free';
};

export const getTrialDaysLeft = (user) => {
  const plan = getUserPlan(user);
  if (plan !== 'free') return null;
  const createdAtStr = user?.profile?.created_at || user?.created_at;
  if (!createdAtStr) return FREE_TRIAL_DAYS; // fallback if missing
  const createdAt = new Date(createdAtStr);
  const now = new Date();
  const msDiff = now.getTime() - createdAt.getTime();
  const daysElapsed = Math.floor(msDiff / (1000 * 60 * 60 * 24));
  const daysLeft = FREE_TRIAL_DAYS - daysElapsed;
  return Math.max(0, daysLeft);
};

export const isAccessRestricted = (user) => {
  if (!user) return true;
  const plan = getUserPlan(user);
  if (plan === 'free') {
    const daysLeft = getTrialDaysLeft(user);
    return daysLeft === 0; // restricted after trial ends
  }
  return false; // paid plans have full access
};

// Handle user login
export const handleLogin = async (userData, setUser, setData) => {
  try {
    // Get user profile to attach plan info
    const profileResult = await SupabaseManager.getUserProfile(userData.id);
    
    if (profileResult.success) {
      // Add profile data to user object
      const userWithProfile = {
        ...userData,
        profile: profileResult.profile,
        // Derived fields for convenience
        plan: 'monthly'
      };
      setUser(userWithProfile);
    } else {
      // If profile fetch fails, still set user but default to free plan
      const userWithProfile = {
        ...userData,
        profile: null,
        plan: 'free'
      };
      setUser(userWithProfile);
      console.warn('Failed to load user profile:', profileResult.error);
    }
    
    await loadUserData(setData);
  } catch (error) {
    console.error('Error during login:', error);
    // Fallback: default to free plan if there's an error
    const userWithProfile = {
      ...userData,
      profile: null,
      plan: 'free'
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

// Check if user has full access (not restricted)
export const isUserActive = (user) => {
  return !isAccessRestricted(user);
};

// Check if user can perform create/edit/delete actions
export const canUserPerformActions = (user) => {
  return isUserActive(user);
};

// Get user active status message
export const getUserStatusMessage = (user) => {
  if (!user) return 'Not logged in';
  const plan = getUserPlan(user);
  if (isAccessRestricted(user)) return 'Access restricted - free trial ended';
  if (plan === 'free') {
    const daysLeft = getTrialDaysLeft(user);
    return `Free trial active - ${daysLeft} day(s) left`;
  }
  return 'Plan active';
};
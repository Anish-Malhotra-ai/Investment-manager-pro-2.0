import { useState, useEffect, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PropertyDetails from './components/PropertyDetails';
import LoanManager from './components/LoanManager';
import TransactionTable from './components/TransactionTable';
import Settings from './components/Settings';
import WelcomeSplash from './components/WelcomeSplash';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import InactiveUserBanner from './components/InactiveUserBanner';
import SupabaseManager from './services/SupabaseManager';
import {
  addNotification,
  formatNotificationTime,
  getNotificationIcon,
  clearAllNotifications
} from './utils/NotificationUtils';
import {
  loadUserData,
  handleSaveDataWithNotification
} from './utils/DataUtils';
import { handleLogin, handleLogout } from './utils/AuthUtils';
import './App.css';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState(null);
  const [data, setData] = useState({
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
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      try {
        await SupabaseManager.init();

        if (SupabaseManager.isAuthenticated()) {
          const currentUser = SupabaseManager.getCurrentUser();
          
          // Fetch user profile data
          const profileResult = await SupabaseManager.getUserProfile(currentUser.id);
          
          if (profileResult.success) {
            // Add profile data to user object
            const userWithProfile = {
              ...currentUser,
              profile: profileResult.profile,
              isActive: profileResult.profile.is_active
            };
            setUser(userWithProfile);
          } else {
            // If profile fetch fails, still set user but mark as inactive for safety
            const userWithProfile = {
              ...currentUser,
              profile: null,
              isActive: false
            };
            setUser(userWithProfile);
            console.warn('Failed to load user profile:', profileResult.error);
          }
          
          await loadUserData(setData);
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        setLoading(false);
        // Show splash screen for 2 seconds
        setTimeout(() => setShowSplash(false), 2000);
      }
    };

    initApp();
  }, []);

  const addNotificationCallback = useCallback((message, type) => {
    addNotification(setData, message, type);
  }, []);

  const handleSaveDataWithNotificationCallback = useCallback(async (newData, actionDescription) => {
    return await handleSaveDataWithNotification(newData, setData, addNotificationCallback, actionDescription);
  }, [addNotificationCallback]);

  const handleLoginCallback = useCallback(async (userData) => {
    await handleLogin(userData, setUser, setData);
  }, []);

  const handleLogoutCallback = useCallback(async () => {
    await handleLogout(setUser, setData);
  }, []);

  const clearAllNotificationsCallback = useCallback(async () => {
    await clearAllNotifications(data, setData, addNotificationCallback);
  }, [data, addNotificationCallback]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (showSplash) {
    return <WelcomeSplash />;
  }

  return (
    <ErrorBoundary>
      <Router>
        <ProtectedRoute user={user} onLogin={handleLoginCallback}>
          <div className="flex flex-col h-screen bg-gray-900">
            <InactiveUserBanner user={user} />
            <Navbar
              user={user}
              notifications={data.settings?.notifications || []}
              onLogout={handleLogoutCallback}
              onClearNotifications={clearAllNotificationsCallback}
              formatNotificationTime={formatNotificationTime}
              getNotificationIcon={getNotificationIcon}
            />

            <div className="flex flex-1 overflow-hidden">
              <Sidebar
                isCollapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                properties={data.properties}
                transactions={data.transactions}
              />

              <main className="flex-1 overflow-auto p-6">
                <Routes>
                  <Route path="/" element={
                    <Dashboard
                      user={user}
                      properties={data.properties}
                      loans={data.loans}
                      transactions={data.transactions}
                      settings={data.settings || { financialYearStart: '07-01', notifications: [] }}
                      onSaveData={handleSaveDataWithNotificationCallback}
                    />
                  } />
                  <Route path="/property/:id" element={
                    <PropertyDetails
                      user={user}
                      data={data}
                      setData={setData}
                      onSaveData={handleSaveDataWithNotificationCallback}
                      addNotification={addNotificationCallback}
                    />
                  } />
                  <Route path="/loans" element={
                    <LoanManager
                      user={user}
                      data={{
                        loans: data.loans,
                        properties: data.properties,
                        transactions: data.transactions,
                        settings: data.settings
                      }}
                      onSaveData={handleSaveDataWithNotificationCallback}
                      addNotification={addNotification}
                    />
                  } />
                  <Route path="/transactions" element={
                    <TransactionTable
                      user={user}
                      transactions={data.transactions}
                      properties={data.properties}
                      onSaveData={handleSaveDataWithNotificationCallback}
                    />
                  } />
                  <Route path="/settings" element={
                    <Settings
                      user={user}
                      settings={data.settings || { financialYearStart: '07-01', notifications: [] }}
                      onSaveData={handleSaveDataWithNotificationCallback}
                    />
                  } />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
          </div>
        </ProtectedRoute>
      </Router>
    </ErrorBoundary>
  );
}

export default App;

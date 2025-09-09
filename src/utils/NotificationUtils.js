import PocketbaseManager from '../services/PocketbaseManager';

// Add notification function
export const addNotification = (setData, message, type = 'info') => {
  const notification = {
    id: Date.now() + Math.random(),
    message,
    type,
    timestamp: new Date().toISOString()
  };

  setData(prevData => ({
    ...prevData,
    settings: {
      ...prevData.settings,
      notifications: [...(prevData.settings.notifications || []), notification]
    }
  }));

  // Auto-remove notification after 5 seconds for success/info types
  if (type === 'success' || type === 'info') {
    setTimeout(() => {
      setData(prevData => ({
        ...prevData,
        settings: {
          ...prevData.settings,
          notifications: prevData.settings.notifications.filter(n => n.id !== notification.id)
        }
      }));
    }, 5000);
  }
};

// Format notification time
export const formatNotificationTime = (timestamp) => {
  try {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60));

    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return notificationTime.toLocaleDateString();
  } catch (error) {
    console.warn('Error formatting notification time:', error);
    return 'unknown';
  }
};

// Get notification icon based on type
export const getNotificationIcon = (type) => {
  switch (type) {
    case 'success': return '✅';
    case 'error': return '❌';
    case 'warning': return '⚠️';
    case 'backup': return '💾';
    case 'reminder': return '🔔';
    case 'transaction': return '💰';
    case 'property': return '🏠';
    case 'rental': return '👥';
    default: return 'ℹ️';
  }
};

// Clear all notifications
export const clearAllNotifications = async (data, setData, addNotificationCallback) => {
  try {
    const updatedSettings = {
      ...data.settings,
      notifications: []
    };
    
    await PocketbaseManager.saveUserSettings(updatedSettings);
    setData(prev => ({
      ...prev,
      settings: updatedSettings
    }));
  } catch (error) {
    console.error('Error clearing notifications:', error);
    addNotificationCallback('Failed to clear notifications', 'error');
  }
};
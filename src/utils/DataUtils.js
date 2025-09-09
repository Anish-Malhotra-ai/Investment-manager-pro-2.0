import PocketbaseManager from '../services/PocketbaseManager';

// Load user data from Pocketbase
export const loadUserData = async (setData) => {
  try {
    const [propertiesResult, loansResult, transactionsResult, settingsResult] = await Promise.all([
      PocketbaseManager.getProperties(),
      PocketbaseManager.getLoans(),
      PocketbaseManager.getTransactions(),
      PocketbaseManager.getSettings()
    ]);

    setData({
      properties: propertiesResult.properties || [],
      loans: loansResult.loans || [],
      transactions: transactionsResult.transactions || [],
      settings: settingsResult.settings || {
        financialYearStart: '07-01',
        notifications: []
      }
    });
  } catch (error) {
    console.error('Failed to load user data:', error);
  }
};

// Handle save data function
export const handleSaveData = async (newData, setData) => {
  try {
    // Update local state
    setData(newData);

    // Save settings to Pocketbase
    if (newData.settings) {
      await PocketbaseManager.saveSettings(newData.settings);
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to save data:', error);
    throw error;
  }
};

// Enhanced save data function that adds notifications for major actions
export const handleSaveDataWithNotification = async (newData, setData, addNotificationCallback, actionDescription) => {
  try {
    await handleSaveData(newData, setData);
    if (actionDescription) {
      addNotificationCallback(actionDescription, 'success');
    }
  } catch (error) {
    if (actionDescription) {
      addNotificationCallback(`Failed: ${actionDescription}`, 'error');
    }
    throw error;
  }
};
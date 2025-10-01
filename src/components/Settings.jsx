import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import DataManager from '../services/DataManager';
import { canUserPerformActions } from '../utils/AuthUtils';

const { FiSave, FiDownload, FiUpload, FiTrash2, FiAlertTriangle, FiCheck, FiFolder, FiSettings } = FiIcons;

const Settings = ({ user, settings, properties, loans, transactions, onSaveData }) => {
  // Check if user can perform actions (create/edit/delete)
  const canPerformActions = canUserPerformActions(user);
  
  const [formData, setFormData] = useState({
    financialYearStart: '07-01',
    currency: 'AUD',
    defaultPropertyType: 'Residential',
    autoBackup: true,
    backupFrequency: 3,
    silentBackup: false,
    backupMethod: 'download',
    recentCategories: [],
    recentPayees: [],
    ...settings
  });
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [storageInfo, setStorageInfo] = useState({ used: 0, quota: 0, percentage: 0 });
  const [loading, setLoading] = useState(false);
  const [backupMethodSet, setBackupMethodSet] = useState(false);

  useEffect(() => {
    loadStorageInfo();
    checkBackupPreferences();
  }, []);

  const loadStorageInfo = async () => {
    try {
      const info = await DataManager.getStorageUsage();
      setStorageInfo(info);
    } catch (error) {
      console.error('Failed to load storage info:', error);
    }
  };

  const checkBackupPreferences = () => {
    const savedMethod = localStorage.getItem('backupMethod');
    const silentMode = localStorage.getItem('silentBackup') === 'true';
    
    if (savedMethod) {
      setFormData(prev => ({
        ...prev,
        backupMethod: savedMethod,
        silentBackup: silentMode
      }));
      setBackupMethodSet(true);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleBackupMethodChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));

    // Save backup preferences immediately
    if (name === 'backupMethod') {
      localStorage.setItem('backupMethod', value);
      DataManager.setBackupMethod(value);
    } else if (name === 'silentBackup') {
      localStorage.setItem('silentBackup', checked.toString());
      DataManager.setSilentBackup(checked);
    }

    setBackupMethodSet(true);
  };

  const testBackupMethod = async () => {
    try {
      setLoading(true);
      const result = await DataManager.testBackupMethod(formData.backupMethod);
      
      if (result.success) {
        alert(`✅ ${formData.backupMethod === 'filesystem' ? 'File System Access' : 'Download'} method is working correctly!`);
      } else {
        alert(`❌ Test failed: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Test failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // Load existing data first to prevent data loss
      const existingData = await DataManager.loadAllData();
      
      // Save settings while preserving all other data
      await onSaveData({
        properties: existingData.properties || properties || [],
        loans: existingData.loans || loans || [],
        transactions: existingData.transactions || transactions || [],
        settings: formData
      });
      
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    }
  };

  const handleExportData = async () => {
    try {
      setLoading(true);
      const filename = DataManager.generateBackupFilename();
      const result = await DataManager.exportBackup(filename);
      
      if (result.success) {
        if (formData.silentBackup) {
          console.log('Data exported successfully (silent mode)');
        } else {
          alert('Data exported successfully!');
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
      if (!formData.silentBackup) {
        alert('Export failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImportData = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const result = await DataManager.importBackup(file);
      
      if (result.success) {
        alert('Data imported successfully! The page will reload to show the imported data.');
        window.location.reload();
      }
    } catch (error) {
      console.error('Import failed:', error);
      alert('Import failed. Please check the file format and try again.');
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const handleResetData = () => {
    setConfirmAction('reset');
    setShowConfirm(true);
  };

  const executeConfirmAction = async () => {
    try {
      setLoading(true);
      
      if (confirmAction === 'reset') {
        await onSaveData({
          properties: [],
          loans: [],
          transactions: [],
          settings: formData
        });
        alert('All data has been reset successfully!');
      }
      
      setShowConfirm(false);
      setConfirmAction(null);
      await loadStorageInfo();
    } catch (error) {
      console.error('Action failed:', error);
      alert('Operation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Configure your application preferences and manage data</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <div className="card">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">General Settings</h2>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Financial Year Start
              </label>
              <select
                name="financialYearStart"
                value={formData.financialYearStart}
                onChange={handleChange}
                className="form-select"
              >
                <option value="01-01">January 1st</option>
                <option value="04-01">April 1st</option>
                <option value="07-01">July 1st (Australia)</option>
                <option value="10-01">October 1st</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Default Currency
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="form-select"
              >
                <option value="AUD">Australian Dollar (AUD)</option>
                <option value="USD">US Dollar (USD)</option>
                <option value="EUR">Euro (EUR)</option>
                <option value="GBP">British Pound (GBP)</option>
                <option value="CAD">Canadian Dollar (CAD)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Default Property Type
              </label>
              <select
                name="defaultPropertyType"
                value={formData.defaultPropertyType}
                onChange={handleChange}
                className="form-select"
              >
                <option value="Residential">Residential</option>
                <option value="Commercial">Commercial</option>
                <option value="Industrial">Industrial</option>
                <option value="Land">Land</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="autoBackup"
                checked={formData.autoBackup}
                onChange={handleChange}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-300">
                Enable automatic backups every {formData.backupFrequency} minutes
              </label>
            </div>

            <button
              onClick={handleSave}
              className="btn-primary w-full flex items-center justify-center space-x-2"
            >
              <SafeIcon icon={FiSave} className="w-5 h-5" />
              <span>Save Settings</span>
            </button>
          </div>
        </div>

        {/* Recent Items Management */}
        <div className="card">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">Recent Items</h2>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Recent Categories ({(formData.recentCategories || []).length}/5)
              </label>
              <div className="bg-gray-700/30 rounded p-3 min-h-[40px]">
                {(formData.recentCategories || []).length === 0 ? (
                  <p className="text-gray-500 text-sm">No recent categories yet</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {formData.recentCategories.map((category, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-purple-900/30 text-purple-300 text-xs rounded-full"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Recent Payees ({(formData.recentPayees || []).length}/5)
              </label>
              <div className="bg-gray-700/30 rounded p-3 min-h-[40px]">
                {(formData.recentPayees || []).length === 0 ? (
                  <p className="text-gray-500 text-sm">No recent payees yet</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {formData.recentPayees.map((payee, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-900/30 text-blue-300 text-xs rounded-full"
                      >
                        {payee}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-700 rounded p-3">
              <p className="text-blue-400 text-sm">
                <SafeIcon icon={FiCheck} className="w-4 h-4 inline mr-2" />
                Recent categories and payees are automatically saved when you add transactions or rentals.
              </p>
            </div>
          </div>
        </div>

        {/* Backup Preferences */}
        <div className="card">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <SafeIcon icon={FiFolder} className="w-5 h-5 mr-2" />
              Backup Preferences
            </h2>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Backup Method
              </label>
              <select
                name="backupMethod"
                value={formData.backupMethod}
                onChange={handleBackupMethodChange}
                className="form-select"
              >
                <option value="download">Download to Browser Downloads</option>
                <option value="filesystem">Choose Save Location (File System Access)</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">
                {formData.backupMethod === 'filesystem' 
                  ? 'You can choose where to save backups (requires modern browser)' 
                  : 'Backups will be saved to your default Downloads folder'
                }
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="silentBackup"
                name="silentBackup"
                checked={formData.silentBackup}
                onChange={handleBackupMethodChange}
                className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-600 rounded focus:ring-purple-500"
              />
              <label htmlFor="silentBackup" className="text-sm font-medium text-gray-300">
                Silent backup mode (no success notifications)
              </label>
            </div>

            {backupMethodSet && (
              <div className="bg-green-900/20 border border-green-700 rounded p-3">
                <p className="text-green-400 text-sm flex items-center">
                  <SafeIcon icon={FiCheck} className="w-4 h-4 mr-2" />
                  Backup preferences saved! All future backups will use these settings.
                </p>
              </div>
            )}

            {canPerformActions && (
              <div className="space-y-3">
                <button
                  onClick={testBackupMethod}
                  disabled={loading}
                  className="btn-secondary w-full flex items-center justify-center space-x-2"
                >
                  <SafeIcon icon={FiSettings} className="w-5 h-5" />
                  <span>{loading ? 'Testing...' : 'Test Backup Method'}</span>
                </button>

                <button
                  onClick={handleExportData}
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center space-x-2"
                >
                  <SafeIcon icon={FiDownload} className="w-5 h-5" />
                  <span>{loading ? 'Exporting...' : 'Create Backup Now'}</span>
                </button>
              </div>
            )}
            
            {!canPerformActions && (
              <div className="bg-yellow-900/20 border border-yellow-700 rounded p-3">
                <p className="text-yellow-400 text-sm flex items-center">
                  <SafeIcon icon={FiAlertTriangle} className="w-4 h-4 mr-2" />
                  Backup features are only available to active users.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="card">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Data Management</h2>
        </div>

        <div className="p-6 space-y-4">
          {/* Storage Usage */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-300">Storage Usage</span>
              <span className="text-sm text-gray-400">
                {formatBytes(storageInfo.used)} / {formatBytes(storageInfo.quota)}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  storageInfo.percentage > 80 ? 'bg-red-500' :
                  storageInfo.percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(storageInfo.percentage, 100)}%` }}
              />
            </div>
            {storageInfo.percentage > 80 && (
              <p className="text-yellow-400 text-xs mt-1">
                <SafeIcon icon={FiAlertTriangle} className="w-3 h-3 inline mr-1" />
                Storage usage is high. Consider exporting and cleaning old data.
              </p>
            )}
          </div>

          {/* Export/Import */}
          {canPerformActions && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                  id="import-file"
                />
                <label
                  htmlFor="import-file"
                  className="btn-secondary w-full flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <SafeIcon icon={FiUpload} className="w-5 h-5" />
                  <span>Import Data</span>
                </label>
              </div>
            </div>
          )}

          {/* Development Tools */}
          {canPerformActions && (
            <div className="pt-4 border-t border-gray-700">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Danger Zone</h3>
              <button
                onClick={handleResetData}
                disabled={loading}
                className="btn-danger w-full flex items-center justify-center space-x-2"
              >
                <SafeIcon icon={FiTrash2} className="w-5 h-5" />
                <span>Reset All Data</span>
              </button>
            </div>
          )}
          
          {!canPerformActions && (
            <div className="bg-yellow-900/20 border border-yellow-700 rounded p-3">
              <p className="text-yellow-400 text-sm flex items-center">
                <SafeIcon icon={FiAlertTriangle} className="w-4 h-4 mr-2" />
                Data management features are only available to active users.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Current Data Summary */}
      <div className="card">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Current Data Summary</h2>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{Array.isArray(properties) ? properties.length : 0}</div>
              <div className="text-sm text-gray-400">Properties</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{Array.isArray(loans) ? loans.length : 0}</div>
              <div className="text-sm text-gray-400">Loans</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{Array.isArray(transactions) ? transactions.length : 0}</div>
              <div className="text-sm text-gray-400">Transactions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {new Date().toLocaleDateString()}
              </div>
              <div className="text-sm text-gray-400">Last Updated</div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700"
          >
            <div className="flex items-center space-x-3 mb-4">
              <SafeIcon icon={FiAlertTriangle} className="w-6 h-6 text-yellow-400" />
              <h3 className="text-lg font-semibold text-white">Confirm Action</h3>
            </div>

            <p className="text-gray-300 mb-6">
              This will permanently delete all your data including properties, loans, and transactions. This action cannot be undone. Are you absolutely sure?
            </p>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setConfirmAction(null);
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={executeConfirmAction}
                disabled={loading}
                className={`flex-1 flex items-center justify-center space-x-2 btn-danger`}
              >
                <SafeIcon icon={FiCheck} className="w-4 h-4" />
                <span>{loading ? 'Processing...' : 'Confirm'}</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default Settings;
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import DataManager from '../services/DataManager';
import { formatCurrency } from '../utils/number';
import { canUserPerformActions } from '../utils/AuthUtils';

const { FiSave, FiClock, FiCheck, FiDownload, FiUpload, FiMove, FiAlertTriangle } = FiIcons;

const BackupStatus = ({ user }) => {
  // Check if user can perform actions (create/edit/delete)
  const canPerformActions = canUserPerformActions(user);
  
  const [lastBackup, setLastBackup] = useState(null);
  const [nextBackup, setNextBackup] = useState(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [storageUsage, setStorageUsage] = useState({ used: 0, quota: 0, percentage: 0 });
  const dragRef = useRef(null);

  useEffect(() => {
    const updateBackupStatus = async () => {
      const lastSave = localStorage.getItem('lastAutoBackup');
      if (lastSave) {
        setLastBackup(new Date(lastSave));
      }

      // Calculate next backup (3 minutes from last backup)
      const nextSave = lastSave 
        ? new Date(new Date(lastSave).getTime() + 3 * 60 * 1000) 
        : new Date(Date.now() + 3 * 60 * 1000);
      setNextBackup(nextSave);

      // Update storage usage
      try {
        const usage = await DataManager.getStorageUsage();
        setStorageUsage(usage);
      } catch (error) {
        console.warn('Failed to get storage usage:', error);
      }
    };

    updateBackupStatus();

    // Update every 30 seconds
    const interval = setInterval(updateBackupStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        handleManualBackup();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const formatTime = (date) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTimeUntilNext = () => {
    if (!nextBackup) return '';
    const now = new Date();
    const diff = nextBackup - now;
    if (diff <= 0) return 'Soon';
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatStorageSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleManualBackup = async () => {
    try {
      const filename = DataManager.generateBackupFilename();
      const result = await DataManager.exportBackup(filename);
      
      if (result.success) {
        localStorage.setItem('lastManualBackup', new Date().toISOString());
        // Show success feedback
        console.log('Manual backup completed successfully');
      }
    } catch (error) {
      console.error('Manual backup failed:', error);
    }
  };

  const handleImportBackup = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
          const result = await DataManager.importBackup(file);
          if (result.success) {
            window.location.reload(); // Refresh to load new data
          } else {
            alert('Import failed: ' + result.error);
          }
        }
      };
      input.click();
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  // Drag functionality
  const handleMouseDown = (e) => {
    if (!dragRef.current) return;
    setIsDragging(true);
    
    const rect = dragRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    const handleMouseMove = (e) => {
      const newX = e.clientX - offsetX;
      const newY = e.clientY - offsetY;
      
      // Keep within viewport bounds
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (!isVisible) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => setIsVisible(true)}
        className="fixed bottom-16 right-4 w-12 h-12 bg-purple-600 hover:bg-purple-700 rounded-full flex items-center justify-center shadow-lg z-40"
        aria-label="Show backup status"
      >
        <SafeIcon icon={FiSave} className="w-5 h-5 text-white" />
      </motion.button>
    );
  }

  if (isMinimized) {
    return (
      <motion.div
        ref={dragRef}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-40 cursor-move"
        style={{
          bottom: `${64 + position.y}px`,
          right: `${16 + position.x}px`,
          maxWidth: '200px'
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center space-x-2">
            <SafeIcon icon={FiSave} className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-white">Next: {getTimeUntilNext()}</span>
          </div>
          <button
            onClick={() => setIsMinimized(false)}
            className="text-gray-400 hover:text-white text-xs"
            aria-label="Expand backup status"
          >
            ↗
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={dragRef}
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg z-40 cursor-move"
      style={{
        bottom: `${64 + position.y}px`,
        right: `${16 + position.x}px`,
        maxWidth: '280px'
      }}
      onMouseDown={handleMouseDown}
      role="dialog"
      aria-label="Backup Status Widget"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-white flex items-center">
          <SafeIcon icon={FiMove} className="w-3 h-3 mr-1 text-gray-400" />
          <SafeIcon icon={FiSave} className="w-3 h-3 mr-1 text-purple-400" />
          Backup Status
        </h3>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="text-gray-400 hover:text-white text-xs"
            aria-label="Minimize"
          >
            ↙
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-white text-xs"
            aria-label="Hide backup status"
          >
            ×
          </button>
        </div>
      </div>

      <div className="space-y-1 text-xs mb-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 flex items-center">
            <SafeIcon icon={FiCheck} className="w-3 h-3 mr-1 text-green-400" />
            Last backup:
          </span>
          <span className="text-white">{formatTime(lastBackup)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-400 flex items-center">
            <SafeIcon icon={FiClock} className="w-3 h-3 mr-1 text-blue-400" />
            Next backup:
          </span>
          <span className="text-white">{getTimeUntilNext()}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-400">Storage used:</span>
          <span className="text-white">
            {formatStorageSize(storageUsage.used)} ({storageUsage.percentage.toFixed(1)}%)
          </span>
        </div>
      </div>

      {canPerformActions ? (
        <div className="flex items-center space-x-2 pt-2 border-t border-gray-700">
          <button
            onClick={handleManualBackup}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs py-1 px-2 rounded flex items-center justify-center space-x-1"
            aria-label="Create manual backup (Ctrl+S)"
          >
            <SafeIcon icon={FiDownload} className="w-3 h-3" />
            <span>Save</span>
          </button>
          <button
            onClick={handleImportBackup}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-xs py-1 px-2 rounded flex items-center justify-center space-x-1"
            aria-label="Import backup"
          >
            <SafeIcon icon={FiUpload} className="w-3 h-3" />
            <span>Load</span>
          </button>
        </div>
      ) : (
        <div className="pt-2 border-t border-gray-700">
          <div className="bg-yellow-900/20 border border-yellow-700 rounded p-2">
            <p className="text-yellow-400 text-xs flex items-center">
              <SafeIcon icon={FiAlertTriangle} className="w-3 h-3 mr-1" />
              Backup features require active user status
            </p>
          </div>
        </div>
      )}

      <div className="mt-2 pt-1 border-t border-gray-700">
        <p className="text-xs text-yellow-400">
          💡 Auto-saving every 3min • Ctrl+S to save
        </p>
      </div>
    </motion.div>
  );
};

export default BackupStatus;
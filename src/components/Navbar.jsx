import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiHome, FiBell, FiX, FiLogOut, FiUser, FiChevronDown } = FiIcons;

const Navbar = ({
  user,
  notifications,
  onLogout,
  onClearNotifications,
  formatNotificationTime,
  getNotificationIcon
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  console.log(user)

  return (
    <nav className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between relative z-50">
      {/* Left side - App title */}
      <div className="flex gap-4 items-center">
        <div className="bg-gradient-to-r from-blue-400 to-purple-600 p-2 rounded-lg">
          <SafeIcon icon={FiHome} className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-white font-bold text-lg">IPM Pro</h1>
          <p className="text-gray-400 text-xs">Investment Property Manager</p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfile(false);
              setShowNotifications(!showNotifications);
            }}
            className="relative p-2 text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-lg transition-colors"
          >
            <SafeIcon icon={FiBell} className="w-6 h-6" />
            {notifications && notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-lg border border-gray-700 max-h-96 overflow-y-auto"
              >
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                  <h3 className="font-semibold text-white">Notifications</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={onClearNotifications}
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      Clear All
                    </button>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-gray-400 hover:text-gray-300"
                    >
                      <SafeIcon icon={FiX} className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto">
                  {notifications && notifications.length > 0 ? (
                    notifications.slice().reverse().map((notification) => (
                      <div key={notification.id} className="p-3 border-b border-gray-700 last:border-b-0">
                        <div className="flex items-start space-x-2">
                          <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                          <div className="flex-1">
                            <p className="text-sm text-white">{notification.message}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatNotificationTime(notification.timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-400">
                      No notifications
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={
              () => {
                setShowNotifications(false)
                setShowProfile(!showProfile)
              }
            }
            className="flex items-center space-x-2 p-2 text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
              <SafeIcon icon={FiUser} className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium">{user?.user_metadata?.name || 'User'}</span>
            <SafeIcon icon={FiChevronDown} className="w-4 h-4" />
          </button>

          {/* Profile Dropdown Menu */}
          <AnimatePresence>
            {showProfile && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 mt-2 bg-gray-800 rounded-lg shadow-lg border border-gray-700"
              >
                <div className="p-2">
                  <div className="px-3 py-2 border-b border-gray-700">
                    <p className="text-sm font-medium text-white">{user?.email || 'User'}</p>
                    <p className="text-xs text-gray-400">Signed in</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowProfile(false);
                      onLogout();
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-gray-700 rounded-md transition-colors"
                  >
                    <SafeIcon icon={FiLogOut} className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
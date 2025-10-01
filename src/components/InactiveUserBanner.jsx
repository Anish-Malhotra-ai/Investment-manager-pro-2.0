import React from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { canUserPerformActions } from '../utils/AuthUtils';

const { FiAlertTriangle, FiUser, FiLock } = FiIcons;

const InactiveUserBanner = ({ user }) => {
  // Don't show banner if user can perform actions (is active) or not logged in
  if (canUserPerformActions(user)) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-yellow-600 to-orange-600 border-b border-yellow-500 shadow-lg"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <SafeIcon icon={FiAlertTriangle} className="w-6 h-6 text-yellow-100" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-100">
                <SafeIcon icon={FiLock} className="w-4 h-4 inline mr-1" />
                Account Activation Required
              </p>
              <p className="text-xs text-yellow-200 mt-1">
                Your account is currently inactive. Activate your account to access all features.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default InactiveUserBanner;
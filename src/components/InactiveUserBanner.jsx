import React from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { getUserPlan, getTrialDaysLeft, isAccessRestricted } from '../utils/AuthUtils';

const { FiAlertTriangle, FiLock } = FiIcons;

const InactiveUserBanner = ({ user }) => {
  const plan = getUserPlan(user);
  const restricted = isAccessRestricted(user);
  const daysLeft = getTrialDaysLeft(user);

  // No banner for paid plans
  if (!user || (plan !== 'free' && !restricted)) return null;

  // Restricted banner after free trial ends
  if (restricted) {
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
                Your free trial has ended. Upgrade to continue using all features.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
    );
  }

  // Free trial banner with days left
  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-blue-600 to-indigo-600 border-b border-blue-500 shadow-lg"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <SafeIcon icon={FiAlertTriangle} className="w-6 h-6 text-blue-100" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-100">
                Free Trial Active
              </p>
              <p className="text-xs text-blue-200 mt-1">
                {typeof daysLeft === 'number' ? `${daysLeft} day(s) left in your free trial.` : 'Trial period information unavailable.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default InactiveUserBanner;
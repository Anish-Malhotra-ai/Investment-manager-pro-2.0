import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { sanitizeNumberInput } from '../utils/number';

const {
  FiHome, FiBarChart, FiCreditCard, FiSettings, FiChevronLeft, FiChevronRight,
  FiTrendingUp, FiMapPin, FiList, FiDollarSign
} = FiIcons;

const Sidebar = ({
  properties = [],
  transactions = [],
  isCollapsed,
  onToggleCollapse
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredProperty, setHoveredProperty] = useState(null);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: FiBarChart, path: '/' },
    { id: 'loans', label: 'Loans', icon: FiCreditCard, path: '/loans' },
    { id: 'transactions', label: 'Transactions', icon: FiList, path: '/transactions' },
    { id: 'payments', label: 'Payments', icon: FiDollarSign, path: '/payments' },
    { id: 'settings', label: 'Settings', icon: FiSettings, path: '/settings' }
  ];

  const formatCurrency = (amount) => {
    const sanitized = sanitizeNumberInput(amount);
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(sanitized);
  };

  const getPropertyIncome = (propertyId) => {
    const safeTransactions = Array.isArray(transactions) ? transactions : [];
    const propertyTransactions = safeTransactions.filter(t => t && t.propertyId === propertyId);
    const currentYear = new Date().getFullYear();
    const yearTransactions = propertyTransactions.filter(t => {
      if (!t || !t.date) return false;
      try {
        return new Date(t.date).getFullYear() === currentYear;
      } catch (e) {
        return false;
      }
    });

    return yearTransactions
      .filter(t => t && t.type === 'income')
      .reduce((sum, t) => sum + sanitizeNumberInput(t.amount), 0);
  };

  const handlePropertyClick = (propertyId) => {
    navigate(`/property/${propertyId}`);
  };

  const isActiveTab = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const isPropertyActive = () => {
    return location.pathname.startsWith('/property/');
  };

  return (
    <motion.div
      initial={{ x: isCollapsed ? -240 : 0 }}
      animate={{ x: 0, width: isCollapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="bg-gray-800 border-r border-gray-700 flex flex-col relative z-60"
    >
      <div className="px-4 pt-4">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-end'}`}>
          <button
            onClick={onToggleCollapse}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded"
          >
            <SafeIcon
              icon={isCollapsed ? FiChevronRight : FiChevronLeft}
              className="w-5 h-5"
            />
          </button>
        </div>
      </div>

      <div className="p-4">
        <nav className="space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${isActiveTab(tab.path)
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
            >
              <SafeIcon icon={tab.icon} className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="font-medium"
                >
                  {tab.label}
                </motion.span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Properties List */}
      {!isCollapsed && (
        <div className="flex-1 px-4 pb-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <h3 className="text-gray-400 text-sm font-medium mb-3 uppercase tracking-wide">
              Properties ({Array.isArray(properties) ? properties.length : 0})
            </h3>

            <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
              {Array.isArray(properties) && properties.length > 0 ? (
                properties.map((property) => (
                  <motion.button
                    key={property.id}
                    onClick={() => handlePropertyClick(property.id)}
                    onMouseEnter={() => setHoveredProperty(property.id)}
                    onMouseLeave={() => setHoveredProperty(null)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${isPropertyActive() && location.pathname === `/property/${property.id}`
                      ? 'bg-blue-600/20 border-blue-500 text-white'
                      : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                      }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <SafeIcon icon={FiMapPin} className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <h4 className="font-medium truncate text-sm">
                            {property.address || 'Unnamed Property'}
                          </h4>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">Value:</span>
                            <span className="text-green-400 font-medium">
                              {formatCurrency(property.purchase_price || 0)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">Income:</span>
                            <span className="text-blue-400 font-medium">
                              {formatCurrency(getPropertyIncome(property.id))}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {hoveredProperty === property.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 pt-2 border-t border-gray-600"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-1">
                              <SafeIcon icon={FiTrendingUp} className="w-3 h-3 text-green-400" />
                              <span className="text-gray-400">Performance</span>
                            </div>
                            <span className="text-green-400 font-medium">+5.2%</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                ))
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <SafeIcon icon={FiHome} className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No properties yet</p>
                  <p className="text-xs">Add your first property to get started</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Collapsed Property Count */}
      {isCollapsed && Array.isArray(properties) && properties.length > 0 && (
        <div className="px-4 pb-4">
          <div className="bg-gray-700/50 rounded-lg p-2 text-center">
            <div className="text-white font-bold text-lg">{properties.length}</div>
            <div className="text-gray-400 text-xs">Properties</div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        {!isCollapsed ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <p className="text-gray-500 text-xs">
              Investment Property Manager Pro
            </p>
            <p className="text-gray-600 text-xs mt-1">
              © 2024 All rights reserved
            </p>
          </motion.div>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 flex items-center justify-center">
              <SafeIcon icon={FiHome} className="w-5 h-5 text-white" />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Sidebar;
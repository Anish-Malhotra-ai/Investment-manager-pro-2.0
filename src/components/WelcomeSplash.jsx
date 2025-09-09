import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiHome, FiTrendingUp, FiDollarSign } = FiIcons;

const WelcomeSplash = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        if (onComplete) {
          onComplete();
        }
      }, 500); // Wait for exit animation
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center pointer-events-none z-40"
        >
          <div className="pointer-events-auto">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ 
                duration: 0.8, 
                ease: [0.175, 0.885, 0.32, 1.275],
                delay: 0.2 
              }}
              className="text-center px-8"
            >
              {/* Logo and Icons */}
              <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="flex items-center justify-center space-x-4 mb-6"
              >
                <motion.div
                  animate={{ 
                    rotate: [0, 5, -5, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-2xl shadow-2xl"
                >
                  <SafeIcon icon={FiHome} className="w-12 h-12 text-white" />
                </motion.div>
                
                <motion.div
                  animate={{ 
                    y: [0, -10, 0],
                    opacity: [0.7, 1, 0.7]
                  }}
                  transition={{ 
                    duration: 1.5,
                    repeat: Infinity,
                    delay: 0.3
                  }}
                  className="bg-gradient-to-r from-green-500 to-blue-500 p-3 rounded-xl"
                >
                  <SafeIcon icon={FiTrendingUp} className="w-8 h-8 text-white" />
                </motion.div>
                
                <motion.div
                  animate={{ 
                    rotate: [0, -5, 5, 0],
                    scale: [1, 1.05, 1]
                  }}
                  transition={{ 
                    duration: 2.5,
                    repeat: Infinity,
                    delay: 0.6
                  }}
                  className="bg-gradient-to-r from-yellow-500 to-green-500 p-3 rounded-xl"
                >
                  <SafeIcon icon={FiDollarSign} className="w-8 h-8 text-white" />
                </motion.div>
              </motion.div>

              {/* Main Title */}
              <motion.h1
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="text-5xl md:text-6xl font-bold text-white mb-4"
              >
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Investment
                </span>
                <br />
                <span className="text-white">Property Manager</span>
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="text-xl md:text-2xl text-gray-300 mb-8 font-light"
              >
                Professional Edition
              </motion.p>

              {/* Feature Pills */}
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1, duration: 0.6 }}
                className="flex flex-wrap justify-center gap-3 mb-8"
              >
                {[
                  'Portfolio Tracking',
                  'Rental Management', 
                  'Financial Analytics',
                  'Loan Calculator'
                ].map((feature, index) => (
                  <motion.span
                    key={feature}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ 
                      delay: 1.2 + (index * 0.1), 
                      duration: 0.4,
                      type: "spring",
                      stiffness: 200
                    }}
                    className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm font-medium border border-white/20"
                  >
                    {feature}
                  </motion.span>
                ))}
              </motion.div>

              {/* Loading Animation */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 0.5 }}
                className="flex items-center justify-center space-x-2"
              >
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{ 
                    duration: 1,
                    repeat: Infinity,
                    delay: 0
                  }}
                  className="w-2 h-2 bg-blue-400 rounded-full"
                />
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{ 
                    duration: 1,
                    repeat: Infinity,
                    delay: 0.2
                  }}
                  className="w-2 h-2 bg-purple-400 rounded-full"
                />
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{ 
                    duration: 1,
                    repeat: Infinity,
                    delay: 0.4
                  }}
                  className="w-2 h-2 bg-pink-400 rounded-full"
                />
              </motion.div>

              {/* Loading Text */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2, duration: 0.5 }}
                className="text-gray-400 text-sm mt-4"
              >
                Loading your portfolio...
              </motion.p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeSplash;
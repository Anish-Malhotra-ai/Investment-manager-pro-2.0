import { useState } from 'react';
import { motion } from 'framer-motion';
import PocketbaseManager from '../services/PocketbaseManager';

const Login = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let result;
      if (isLogin) {
        result = await PocketbaseManager.login(formData.email, formData.password);
      } else {
        if (formData.password !== formData.passwordConfirm) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        result = await PocketbaseManager.register(
          formData.email,
          formData.password,
          formData.passwordConfirm,
          formData.name
        );
      }

      if (result.success) {
        onLogin(result.user);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/20 w-full max-w-md"
      >
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
        >
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </motion.h2>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 shadow-sm"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-white text-black border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
                placeholder="Enter your full name"
              />
            </motion.div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md text-black"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 bg-white text-black border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
              placeholder="••••••••"
            />
          </div>

          {!isLogin && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                name="passwordConfirm"
                value={formData.passwordConfirm}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 bg-white text-black border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
                placeholder="••••••••"
              />
            </motion.div>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Please wait...</span>
              </div>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </motion.button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin)
              setError('')
            }}
            className="text-blue-600 hover:text-purple-600 text-sm font-medium transition-colors duration-200 hover:underline"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
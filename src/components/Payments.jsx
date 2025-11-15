import React, { useEffect, useMemo, useState } from 'react';
import * as FiIcons from 'react-icons/fi';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import StripeManager from '../services/StripeManager';
import SupabaseManager from '../services/SupabaseManager';
import { getUserPlan } from '../utils/AuthUtils';

const { FiDollarSign, FiCheck, FiXCircle, FiRefreshCw } = FiIcons;

const paymentPlans = [
  {
    label: 'Monthly',
    key: 'monthly',
    productId: 'prod_TKxXRKi02WpYrV',
    desc: 'Flexible month-to-month access.',
    price: 3.99,
    priceSuffix: '/mo',
    points: [
      'Cancel anytime',
      'Full feature access',
      'Great for trying things out'
    ]
  },
  {
    label: 'Annual',
    key: 'yearly',
    productId: 'prod_TKxbg6sZOnAH6V',
    desc: 'Best value with yearly billing.',
    price: 29.99,
    priceSuffix: '/yr',
    mostPopular: true,
    points: [
      'Best value vs monthly',
      'Priority support',
      'All features included'
    ]
  },
  {
    label: 'Lifetime',
    key: 'lifetime',
    productId: 'prod_TKxd2zJsqX3Nzk',
    desc: 'One-time payment for lifetime access.',
    price: 39.99,
    priceSuffix: ' one-time',
    points: [
      'One payment, lifetime access',
      'No renewals or subscriptions',
      'Includes all future updates'
    ]
  }
];

const Payments = ({ user }) => {
  const [userPlan, setUserPlan] = useState('free');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [lastPaymentAt, setLastPaymentAt] = useState(null);

  // Compute next due date and grace state
  const dueState = useMemo(() => {
    if (!lastPaymentAt) return null;
    if (userPlan !== 'monthly' && userPlan !== 'yearly') return null;
    const last = new Date(lastPaymentAt);
    if (isNaN(last.getTime())) return null;
    const nextDue = new Date(last);
    if (userPlan === 'monthly') {
      nextDue.setMonth(nextDue.getMonth() + 1);
    } else {
      nextDue.setMonth(nextDue.getMonth() + 12);
    }
    const now = new Date();
    const msDiff = nextDue.getTime() - now.getTime();
    const daysUntilDue = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
    const overdueDays = daysUntilDue < 0 ? Math.abs(daysUntilDue) : 0;
    const graceDaysLeft = overdueDays > 0 ? Math.max(0, 7 - overdueDays) : null;
    return { nextDue, daysUntilDue, overdueDays, graceDaysLeft };
  }, [lastPaymentAt, userPlan]);

  useEffect(() => {
    const init = async () => {
      try {
        if (user?.profile?.plan) {
          setUserPlan(user.profile.plan);
          setLastPaymentAt(user.profile.last_payment_at || null);
        } else if (user) {
          const profileRes = await SupabaseManager.getUserProfile(user.id);
          if (profileRes.success) {
            setUserPlan(profileRes.profile?.plan || getUserPlan(user));
            setLastPaymentAt(profileRes.profile?.last_payment_at || null);
          } else {
            setUserPlan(getUserPlan(user));
            setLastPaymentAt(null);
          }
        }
      } catch (e) {
        setUserPlan(getUserPlan(user));
        setLastPaymentAt(null);
      }
    };
    init();
  }, [user]);

  const isAllowed = (planKey) => {
    if (userPlan === 'free') return true;
    if (userPlan === 'monthly') return planKey === 'yearly' || planKey === 'lifetime';
    if (userPlan === 'yearly') return planKey === 'lifetime';
    return false; // lifetime cannot choose anything
  };

  const handlePurchase = async (planKey, productId) => {
    if (!user) return alert('Please log in first');
    try {
      setLoading(true);
      setMessage('Starting checkout...');
      const result = await StripeManager.createCheckoutSession({
        plan: planKey,
        productId,
        userId: user?.id || user?.user?.id,
      });
      setLoading(false);
      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        setMessage(`Failed to start checkout: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      setLoading(false);
      setMessage(`Checkout failed: ${error.message}`);
    }
  };

  const handleCancel = async () => {
    if (!user) return alert('Please log in first');
    try {
      setLoading(true);
      setMessage('Cancelling subscription...');
      const res = await SupabaseManager.updateUserProfile(user.id, { plan: 'free' });
      setLoading(false);
      if (res.success) {
        setUserPlan('free');
        setMessage('Subscription cancelled. Your plan is now Free.');
      } else {
        setMessage(`Failed to cancel: ${res.error}`);
      }
    } catch (e) {
      setLoading(false);
      setMessage(`Error cancelling subscription: ${e.message}`);
    }
  };

  const getCtaLabel = (planKey) => {
    const map = {
      monthly: 'Start Monthly',
      yearly: userPlan === 'monthly' ? 'Upgrade to Yearly' : 'Start Yearly',
      lifetime: userPlan === 'yearly' || userPlan === 'monthly' ? 'Upgrade to Lifetime' : 'Get Lifetime',
    };
    return map[planKey] || 'Choose Plan';
  };

  // Auto-downgrade after grace period expires
  useEffect(() => {
    const enforceGraceExpiry = async () => {
      if (!user || !dueState) return;
      if (userPlan !== 'monthly' && userPlan !== 'yearly') return;
      if (dueState.overdueDays && dueState.overdueDays > 7) {
        try {
          setMessage('Subscription expired. Converting to Free plan...');
          const res = await SupabaseManager.updateUserProfile(user.id, { plan: 'free' });
          if (res.success) {
            setUserPlan('free');
            setMessage('Your plan has been converted to Free due to non-payment.');
          } else {
            setMessage(`Failed to convert plan: ${res.error}`);
          }
        } catch (e) {
          setMessage(`Error converting plan: ${e.message}`);
        }
      }
    };
    enforceGraceExpiry();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dueState, userPlan, user]);

  return (
    <div className="space-y-8">
      {/* Hero: Current Plan */}
      <div
        className={`rounded-2xl border p-6 md:p-7 bg-gradient-to-r ${
          userPlan === 'free'
            ? 'from-blue-900/60 to-blue-800/30 border-blue-700'
            : userPlan === 'lifetime'
            ? 'from-green-900/60 to-green-800/30 border-green-700'
            : 'from-indigo-900/60 to-indigo-800/30 border-indigo-700'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center">
            <SafeIcon icon={FiDollarSign} className={`w-8 h-8 mr-3 ${userPlan === 'free' ? 'text-blue-400' : 'text-green-400'}`} />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Your Current Plan</h1>
              <p className="text-gray-300 mt-1 text-sm">Manage billing and upgrades below. Your current plan is highlighted.</p>
            </div>
          </div>
          <div className="flex items-center">
            <span className={`px-8 py-2 rounded-lg text-md font-semibold capitalize border ${
              userPlan === 'free'
                ? 'bg-blue-800 text-blue-100 border-blue-600'
                : userPlan === 'lifetime'
                ? 'bg-green-800 text-green-100 border-green-600'
                : 'bg-indigo-800 text-indigo-100 border-indigo-600'
            }`}>
              Current Plan: {userPlan}
            </span>
          </div>
        </div>
        {userPlan === 'lifetime' && (
          <div className="mt-3 text-xs text-green-200">
            You have Lifetime access. No further upgrades are available.
          </div>
        )}
        {userPlan === 'free' && (
          <div className="mt-3 text-xs text-blue-200">
            Upgrade to unlock full features with Monthly, Yearly, or Lifetime access.
          </div>
        )}

        {/* Billing Banners: due and grace period */}
        {dueState && userPlan !== 'free' && userPlan !== 'lifetime' && (
          <div className="mt-4">
            {dueState.daysUntilDue >= 0 && dueState.daysUntilDue <= 7 && (
              <div className="rounded-md border border-yellow-600 bg-yellow-900/30 text-yellow-100 p-3 text-sm">
                Your payment is due in the next {dueState.daysUntilDue} day{dueState.daysUntilDue === 1 ? '' : 's'}.
              </div>
            )}
            {dueState.daysUntilDue < 0 && dueState.overdueDays <= 7 && (
              <div className="rounded-md border border-red-600 bg-red-900/30 text-red-100 p-3 text-sm">
                Payment due date has passed. {dueState.graceDaysLeft} day{dueState.graceDaysLeft === 1 ? '' : 's'} left before termination.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {paymentPlans.map((plan) => (
          <motion.div
            key={plan.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow ${
              userPlan === plan.key
                ? 'border-2 border-green-500 bg-green-900/10'
                : plan.mostPopular
                ? 'border border-yellow-500/60 bg-gray-900/60'
                : 'border border-gray-700 bg-gray-900/60'
            }`}
          >
            {/* Most Popular badge for Yearly */}
            {plan.mostPopular && (
              <div className="absolute -top-3 right-4">
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-400 text-gray-900 shadow">
                  Most Popular
                </span>
              </div>
            )}

            <div className="flex items-start justify-between">
              <div>
                <div className="text-white text-lg font-semibold tracking-wide">{plan.label}</div>
                <div className="mt-2 flex items-end">
                  <div className="text-3xl font-extrabold text-white tracking-tight">
                    <span className="mr-1">A$</span>
                    <span>{plan.price.toFixed(2)}</span>
                  </div>
                  <span className="ml-2 text-sm text-gray-300">{plan.priceSuffix}</span>
                </div>
              </div>
              {userPlan === plan.key && (
                <div className="flex items-center">
                  <span className="px-2 py-1 text-xs font-semibold rounded bg-green-600 text-white">Current Plan</span>
                </div>
              )}
            </div>

            <div className="mt-3 text-sm text-gray-300">{plan.desc}</div>

            {/* Points */}
            <ul className="mt-4 space-y-2">
              {plan.points.map((pt, idx) => (
                <li key={idx} className="flex items-center text-sm text-gray-300">
                  <SafeIcon icon={FiCheck} className="w-4 h-4 text-green-400 mr-2" />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>

            <div className="mt-5">
              {userPlan === plan.key ? (
                <button
                  className="w-full px-4 py-2 rounded-md text-white font-medium bg-green-700 cursor-default"
                  disabled
                >
                  Current Plan
                </button>
              ) : (
                <button
                  className={`w-full px-4 py-2 rounded-md text-white font-medium transition-all duration-200 ${isAllowed(plan.key) && user
                    ? 'bg-indigo-600 hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-400'
                    : 'bg-gray-700 text-gray-300 cursor-not-allowed'}`}
                  disabled={!isAllowed(plan.key) || !user}
                  onClick={() => handlePurchase(plan.key, plan.productId)}
                >
                  {isAllowed(plan.key) ? getCtaLabel(plan.key) : 'Not available for your plan'}
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Cancel Section */}
      {(userPlan === 'monthly' || userPlan === 'yearly') && (
        <div className="rounded-xl border border-red-700 bg-red-900/20 p-6">
          <div className="flex items-center">
            <SafeIcon icon={FiXCircle} className="w-5 h-5 text-red-400 mr-2" />
            <span className="text-white font-semibold">Cancel Subscription</span>
          </div>
          <p className="text-sm text-gray-300 mt-2">Cancelling will immediately set your account to the Free plan.</p>
          <div className="mt-4">
            <button
              className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-md text-white font-medium focus:ring-2 focus:ring-red-400"
              onClick={handleCancel}
            >
              Cancel and switch to Free
            </button>
          </div>
        </div>
      )}

      {message && (
        <div className="flex items-center text-sm text-gray-300">
          <SafeIcon icon={FiRefreshCw} className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          <span>{message}</span>
        </div>
      )}
    </div>
  );
};

export default Payments;
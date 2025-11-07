import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import SupabaseManager from '../services/SupabaseManager';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiCheckCircle, FiXCircle } = FiIcons;

const CheckoutResult = ({ user }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState(searchParams.get('status'));
  const plan = searchParams.get('plan');
  const sessionId = searchParams.get('session_id');
  const [message, setMessage] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!status) return;
      if (status === 'success' && plan && user) {
        // Optionally verify session on backend here using sessionId
        setUpdating(true);
        const result = await SupabaseManager.updateUserProfile(user.id, { plan });
        setUpdating(false);
        if (result.success) {
          setMessage('Plan updated successfully. Redirecting to dashboard...');
          setTimeout(() => navigate('/'), 1500);
        } else {
          setMessage(`Failed to update plan: ${result.error}`);
        }
      } else if (status === 'cancel') {
        setMessage('Checkout was canceled. No changes made.');
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, plan, sessionId, user]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white">Checkout Result</h1>
      <div className="mt-4 bg-gray-900/50 p-4 rounded-md border border-gray-800 text-gray-300">
        {status === 'success' ? (
          <div className="flex items-center">
            <SafeIcon icon={FiCheckCircle} className="w-6 h-6 text-green-400 mr-2" />
            <span>Payment successful for plan: <span className="capitalize text-white font-medium">{plan}</span></span>
          </div>
        ) : status === 'cancel' ? (
          <div className="flex items-center">
            <SafeIcon icon={FiXCircle} className="w-6 h-6 text-red-400 mr-2" />
            <span>Checkout canceled.</span>
          </div>
        ) : (
          <span>No checkout status provided.</span>
        )}
        {message && <div className="mt-3 text-sm text-gray-400">{message}</div>}
        {updating && <div className="mt-2 text-xs text-gray-500">Updating your account...</div>}
      </div>
    </div>
  );
};

export default CheckoutResult;
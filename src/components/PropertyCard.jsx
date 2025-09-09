import React from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { computePurchasePrice, getPropertyLoanInfo, getActiveRentals, getTotalActiveRentalIncome, formatCurrencyWithFrequency } from '../utils/FinancialCalculations';
import { formatCurrency, sanitize, formatForInput } from '../utils/number';

const { FiMapPin, FiCalendar, FiDollarSign, FiTrendingUp, FiCreditCard, FiPercent, FiClock, FiUsers } = FiIcons;

const PropertyCard = ({ property, onClick, transactions = [], loans = [] }) => {
  if (!property) return null;

  const formatPercentage = (rate) => {
    return `${sanitize(rate).toFixed(2)}%`;
  };

  const formatPaymentType = (type) => {
    return type === 'principal_interest' ? 'P&I' : 'Interest Only';
  };

  const formatFrequency = (frequency) => {
    const frequencies = {
      'weekly': 'Weekly',
      'fortnightly': 'Fortnightly', 
      'monthly': 'Monthly',
      'quarterly': 'Quarterly',
      'annually': 'Annually'
    };
    return frequencies[frequency] || frequency;
  };

  // Safe array handling
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeLoans = Array.isArray(loans) ? loans : [];

  // Calculate current year income
  const currentYear = new Date().getFullYear();
  const yearlyIncome = safeTransactions
    .filter(t => t && t.propertyId === property.id && t.type === 'income')
    .filter(t => t && t.date && new Date(t.date).getFullYear() === currentYear)
    .reduce((sum, t) => sum + sanitize(t.amount), 0);

  // Calculate current year expenses
  const yearlyExpenses = safeTransactions
    .filter(t => t && t.propertyId === property.id && t.type === 'expense')
    .filter(t => t && t.date && new Date(t.date).getFullYear() === currentYear)
    .reduce((sum, t) => sum + sanitize(t.amount), 0);

  const netIncome = yearlyIncome - yearlyExpenses;
  const purchasePrice = computePurchasePrice(property);
  const yieldPercentage = purchasePrice > 0 ? (yearlyIncome / purchasePrice) * 100 : 0;

  // Get comprehensive loan information for this property
  const propertyLoans = safeLoans.filter(loan => loan && loan.propertyId === property.id);
  const activeLoans = propertyLoans.filter(loan => {
    if (!loan || !loan.startDate) return false;
    const today = new Date();
    const endDate = loan.endDate ? new Date(loan.endDate) : new Date(2099, 11, 31);
    return new Date(loan.startDate) <= today && today <= endDate;
  });

  // Calculate total loan amounts and repayments
  const totalLoanAmount = activeLoans.reduce((sum, loan) => sum + sanitize(loan.originalAmount), 0);
  const totalMonthlyRepayment = activeLoans.reduce((sum, loan) => sum + sanitize(loan.regularPaymentAmount), 0);

  // For display purposes, show details of the primary loan if there's only one
  const primaryLoan = activeLoans.length === 1 ? activeLoans[0] : null;

  // Get rental information - enhanced for multiple rentals
  const activeRentals = getActiveRentals(property);
  const totalActiveRentalIncome = getTotalActiveRentalIncome(property);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-gray-800 rounded-xl border border-gray-700 p-6 cursor-pointer hover:border-blue-500 transition-all duration-300 shadow-lg hover:shadow-xl"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <SafeIcon icon={FiMapPin} className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">
              {property.address || 'Unnamed Property'}
            </h3>
            <p className="text-gray-400 text-sm">
              {property.suburb && property.state ? `${property.suburb}, ${property.state}` : ''}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-green-400 font-bold text-xl">
            {formatCurrency(purchasePrice)}
          </div>
          <div className="text-gray-400 text-sm">Total Purchase Cost</div>
        </div>
      </div>

      {/* Enhanced Rental Information for Multiple Rentals */}
      {activeRentals.length > 0 && (
        <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2 mb-2">
            {activeRentals.length > 1 && <SafeIcon icon={FiUsers} className="w-4 h-4 text-purple-400" />}
            <span className="text-purple-400 font-medium text-sm">
              {activeRentals.length === 1 ? 'Active Rental' : `${activeRentals.length} Active Rentals`}
            </span>
          </div>
          
          {activeRentals.length === 1 ? (
            <div className="text-purple-300 font-semibold">
              {formatCurrencyWithFrequency(activeRentals[0].amount, activeRentals[0].frequency)}
            </div>
          ) : (
            <div>
              <div className="text-purple-300 font-semibold mb-2">
                {formatCurrency(totalActiveRentalIncome)} annually
              </div>
              <div className="space-y-1">
                {activeRentals.slice(0, 2).map((rental, index) => (
                  <div key={rental.id || index} className="text-xs text-purple-200 flex justify-between">
                    <span>{rental.roomDescription || `Unit ${index + 1}`}</span>
                    <span>{formatCurrency(rental.amount)} {rental.frequency}</span>
                  </div>
                ))}
                {activeRentals.length > 2 && (
                  <div className="text-xs text-purple-400">
                    +{activeRentals.length - 2} more rentals
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Financial Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-700/50 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <SafeIcon icon={FiTrendingUp} className="w-4 h-4 text-green-400" />
            <span className="text-gray-400 text-sm">Yearly Income</span>
          </div>
          <div className="text-green-400 font-semibold">
            {formatCurrency(yearlyIncome)}
          </div>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <SafeIcon icon={FiDollarSign} className="w-4 h-4 text-red-400" />
            <span className="text-gray-400 text-sm">Yearly Expenses</span>
          </div>
          <div className="text-red-400 font-semibold">
            {formatCurrency(yearlyExpenses)}
          </div>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <SafeIcon icon={FiPercent} className="w-4 h-4 text-blue-400" />
            <span className="text-gray-400 text-sm">Gross Yield</span>
          </div>
          <div className="text-blue-400 font-semibold">
            {yieldPercentage.toFixed(2)}%
          </div>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <SafeIcon icon={FiCalendar} className="w-4 h-4 text-purple-400" />
            <span className="text-gray-400 text-sm">Net Income</span>
          </div>
          <div className={`font-semibold ${netIncome >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(netIncome)}
          </div>
        </div>
      </div>

      {/* Comprehensive Loan Information */}
      {activeLoans.length > 0 && (
        <div className="bg-cyan-900/20 border border-cyan-700/50 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-2 mb-3">
            <SafeIcon icon={FiCreditCard} className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-400 font-medium text-sm">
              Active Loans ({activeLoans.length})
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div className="text-gray-400 text-xs mb-1">Total Loan Amount</div>
              <div className="text-cyan-300 font-semibold text-sm">
                {formatCurrency(totalLoanAmount)}
              </div>
            </div>
            
            <div>
              <div className="text-gray-400 text-xs mb-1">Total Monthly Repayment</div>
              <div className="text-cyan-300 font-semibold text-sm">
                {formatCurrency(totalMonthlyRepayment)}
              </div>
            </div>
          </div>

          {/* Single Loan Details */}
          {primaryLoan && (
            <div className="border-t border-cyan-700/30 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-gray-400 text-xs mb-1">Interest Rate</div>
                  <div className="text-cyan-300 font-semibold text-sm">
                    {formatPercentage(primaryLoan.interestRate)}
                  </div>
                </div>
                
                <div>
                  <div className="text-gray-400 text-xs mb-1">Payment Type</div>
                  <div className="text-cyan-300 font-semibold text-sm">
                    {formatPaymentType(primaryLoan.paymentType)}
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="text-gray-400 text-xs mb-1">Payment Frequency</div>
                  <div className="text-cyan-300 font-semibold text-sm">
                    {formatFrequency(primaryLoan.frequency)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Multiple Loans Summary */}
          {activeLoans.length > 1 && (
            <div className="border-t border-cyan-700/30 pt-3">
              <div className="text-cyan-400 text-xs mb-2">Multiple Loans Summary:</div>
              <div className="space-y-1">
                {activeLoans.map((loan, index) => (
                  <div key={loan.id || index} className="flex justify-between text-xs">
                    <span className="text-gray-400">
                      Loan {index + 1}: {formatPaymentType(loan.paymentType)}
                    </span>
                    <span className="text-cyan-300">
                      {formatCurrency(loan.originalAmount)} @ {formatPercentage(loan.interestRate)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="text-cyan-400 text-xs mt-2">
                Click to view individual loan details
              </div>
            </div>
          )}
        </div>
      )}

      {/* Property Details */}
      <div className="flex items-center justify-between text-sm text-gray-400">
        <div className="flex items-center space-x-4">
          {property.bedrooms && (
            <span>{property.bedrooms} bed</span>
          )}
          {property.bathrooms && (
            <span>{property.bathrooms} bath</span>
          )}
          {property.propertyType && (
            <span className="capitalize">{property.propertyType}</span>
          )}
        </div>
        <div className="text-blue-400 hover:text-blue-300 transition-colors">
          View Details →
        </div>
      </div>
    </motion.div>
  );
};

export default PropertyCard;
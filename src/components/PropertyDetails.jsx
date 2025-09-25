import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import PropertyInfo from './PropertyInfo';
import RentalManager from './RentalManager';
import ExpenseManager from './ExpenseManager';
import LoanManager from './LoanManager';
import AgentManager from './AgentManager';
import TransactionTable from './TransactionTable';
import { calculatePropertyMetrics } from '../utils/FinancialCalculations';
import { formatCurrency } from '../utils/number';

const { FiArrowLeft, FiHome, FiDollarSign, FiCreditCard, FiTrendingDown, FiUsers, FiList } = FiIcons;

function PropertyDetails({ data, onSaveData, addNotification }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  // Safe array handling with proper defaults
  const safeProperties = Array.isArray(data.properties) ? data.properties : [];
  const safeLoans = Array.isArray(data.loans) ? data.loans : [];
  const safeTransactions = Array.isArray(data.transactions) ? data.transactions : [];
  const safeRentals = Array.isArray(data.rentals) ? data.rentals : [];
  const safeExpenses = Array.isArray(data.expenses) ? data.expenses : [];
  const safeSettings = data.settings && typeof data.settings === 'object' ? data.settings : {};

  const property = safeProperties.find(p => p && p.id === id);

  useEffect(() => {
    if (!property) {
      navigate('/');
    }
  }, [property, navigate]);

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Property not found</div>
      </div>
    );
  }

  const currentYear = new Date().getFullYear();
  const metrics = calculatePropertyMetrics(property, safeTransactions, [], [], safeLoans, currentYear);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FiHome },
    { id: 'rentals', label: 'Rentals', icon: FiDollarSign },
    { id: 'expenses', label: 'Expenses', icon: FiTrendingDown },
    { id: 'loans', label: 'Loans', icon: FiCreditCard },
    { id: 'agents', label: 'Agents', icon: FiUsers },
    { id: 'transactions', label: 'Transactions', icon: FiList }
  ];

  const handleSaveDataWithNotification = (newData, actionDescription) => {
    onSaveData(newData, actionDescription);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b rounded-t-xl border-gray-700 p-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/')}
                className="mr-4 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <SafeIcon icon={FiArrowLeft} className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-white">{property.name}</h1>
                <p className="text-sm text-gray-400">{property.address}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-green-400">
                {formatCurrency(metrics.netCashFlow)}
              </div>
              <div className="text-xs text-gray-400">Net Cash Flow</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-800 border-b rounded-b-xl border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                  }`}
              >
                <SafeIcon icon={tab.icon} className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <PropertyInfo
            property={property}
            properties={safeProperties}
            onSaveData={handleSaveDataWithNotification}
            metrics={metrics}
            addNotification={addNotification}
          />
        )}

        {activeTab === 'rentals' && (
          <RentalManager
            property={property}
            properties={safeProperties}
            rentals={safeRentals}
            onSaveData={handleSaveDataWithNotification}
            loans={safeLoans}
            transactions={safeTransactions}
            settings={safeSettings}
            addNotification={addNotification}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpenseManager
            property={property}
            properties={safeProperties}
            onSaveData={handleSaveDataWithNotification}
            loans={safeLoans}
            transactions={safeTransactions}
            expenses={safeExpenses}
            settings={safeSettings}
            addNotification={addNotification}
          />
        )}

        {activeTab === 'loans' && (
          <LoanManager
            property={property}
            propertyId={property.id}
            properties={safeProperties}
            onSaveData={handleSaveDataWithNotification}
            loans={safeLoans}
            transactions={safeTransactions}
            settings={safeSettings}
            addNotification={addNotification}
          />
        )}

        {activeTab === 'agents' && (
          <AgentManager
            property={property}
            properties={safeProperties}
            onSaveData={handleSaveDataWithNotification}
            agents={data.agents || []}
            addNotification={addNotification}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionTable
            transactions={safeTransactions.filter(t => t && t.propertyId === property.id)}
            propertyId={property.id}
            properties={safeProperties}
            loans={safeLoans}
            settings={safeSettings}
            onSaveData={handleSaveDataWithNotification}
            addNotification={addNotification}
          />
        )}
      </div>
    </div>
  );
}

export default PropertyDetails;
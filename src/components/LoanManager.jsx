import React, { useState, useMemo } from 'react';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { formatCurrency } from '../utils/number';
import { createLoan, updateLoan, deleteLoan } from '../utils/DataUtils';

const { FiPlus, FiEdit2, FiTrash2, FiChevronDown, FiChevronRight, FiCreditCard } = FiIcons;

function LoanManager({ data, propertyId, onSaveData }) {
  const [showForm, setShowForm] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [expandedProperties, setExpandedProperties] = useState(new Set());

  // Safe defaults for all props
  const safeLoans = Array.isArray(data.loans) ? data.loans : [];
  const safeProperties = Array.isArray(data.properties) ? data.properties : [];

  // Filter loans based on propertyId
  const propertyLoans = useMemo(
    () => (propertyId ? safeLoans.filter(l => l && l.property_id === propertyId) : safeLoans),
    [safeLoans, propertyId]
  );

  // Group loans by property when no propertyId is provided
  const groupedLoans = useMemo(() => {
    if (propertyId) {
      return { [propertyId]: propertyLoans };
    } else {
      const grouped = {};
      safeLoans.forEach(loan => {
        if (loan && loan.property_id) {
          if (!grouped[loan.property_id]) {
            grouped[loan.property_id] = [];
          }
          grouped[loan.property_id].push(loan);
        }
      });
      return grouped;
    }
  }, [safeLoans, propertyId, propertyLoans]);

  const [formData, setFormData] = useState({
    propertyId: propertyId || '',
    lender: '',
    loanType: 'conventional',
    amount: '',
    currentBalance: '',
    interestRate: '',
    termYears: '',
    monthlyPayment: '',
    startDate: '',
    status: 'active'
  });

  const [errors, setErrors] = useState({});

  React.useEffect(() => {
    if (!propertyId) {
      // Expand all properties by default when viewing all loans
      const allPropertyIds = Object.keys(groupedLoans);
      setExpandedProperties(new Set(allPropertyIds));
    }
  }, [groupedLoans, propertyId]);

  const togglePropertyExpansion = (propId) => {
    const newExpanded = new Set(expandedProperties);
    if (newExpanded.has(propId)) {
      newExpanded.delete(propId);
    } else {
      newExpanded.add(propId);
    }
    setExpandedProperties(newExpanded);
  };

  const resetForm = () => {
    setFormData({
      propertyId: propertyId || '',
      lender: '',
      loanType: 'conventional',
      amount: '',
      currentBalance: '',
      interestRate: '',
      termYears: '',
      monthlyPayment: '',
      startDate: '',
      status: 'active'
    });
    setErrors({});
    setEditingLoan(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.propertyId) newErrors.propertyId = 'Property is required';
    if (!formData.lender.trim()) newErrors.lender = 'Lender is required';
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    if (!formData.interestRate || parseFloat(formData.interestRate) < 0 || parseFloat(formData.interestRate) > 100) {
      newErrors.interestRate = 'Interest rate must be between 0 and 100%';
    }
    if (!formData.termYears || parseInt(formData.termYears) <= 0) {
      newErrors.termYears = 'Term years must be greater than 0';
    }
    if (!formData.startDate) newErrors.startDate = 'Start date is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const loanData = {
        property_id: formData.propertyId,
        lender: formData.lender,
        amount: parseFloat(formData.amount),
        interest_rate: parseFloat(formData.interestRate) / 100, // Convert percentage to decimal
        term_years: parseInt(formData.termYears),
        start_date: formData.startDate,
        monthly_payment: formData.monthlyPayment ? parseFloat(formData.monthlyPayment) : 0
      };

      let result;
      if (editingLoan) {
        // Update existing loan in PocketBase
        result = await updateLoan(editingLoan.id, loanData);
        if (!result.success) {
          console.error('Failed to update loan:', result.error);
          return;
        }
      } else {
        // Create new loan in PocketBase
        result = await createLoan(loanData);
        if (!result.success) {
          console.error('Failed to create loan:', result.error);
          return;
        }
      }

      setShowForm(false);
      resetForm();
      
      // Trigger data refresh with notification
      if (onSaveData) {
        const actionDescription = editingLoan ? 'Loan updated successfully' : 'Loan created successfully';
        onSaveData(null, actionDescription);
      }
    } catch (error) {
      console.error('Error saving loan:', error);
    }
  };

  const handleEdit = (loan) => {
    setEditingLoan(loan);
    setFormData({
      propertyId: loan.property_id,
      lender: loan.lender,
      loanType: loan.loanType || 'conventional',
      amount: loan.amount.toString(),
      currentBalance: loan.currentBalance ? loan.currentBalance.toString() : '',
      interestRate: (loan.interest_rate * 100).toString(),
      termYears: loan.term_years.toString(),
      monthlyPayment: loan.monthly_payment.toString(),
      startDate: loan.start_date,
      status: loan.status || 'active'
    });
    setShowForm(true);
  };

  const handleDelete = async (loanId) => {
    if (window.confirm('Are you sure you want to delete this loan?')) {
      try {
        // Delete loan from PocketBase
        const result = await deleteLoan(loanId);
        if (!result.success) {
          console.error('Failed to delete loan:', result.error);
          return;
        }
        
        // Trigger data refresh with notification
        if (onSaveData) {
          onSaveData(null, 'Loan deleted successfully');
        }
      } catch (error) {
        console.error('Error deleting loan:', error);
      }
    }
  };

  const getPropertyName = (propId) => {
    const property = safeProperties.find(p => p && p.id === propId);
    return property ? property.address : 'Unknown Property';
  };

  const getPropertyLoanStats = (propLoans) => {
    const totalAmount = propLoans.reduce((sum, loan) => sum + (loan.currentBalance || loan.amount), 0);
    const totalMonthly = propLoans.reduce((sum, loan) => sum + (loan.monthly_payment || 0), 0);

    return {
      active: propLoans.length,
      total: propLoans.length,
      totalAmount,
      totalMonthly
    };
  };

  const renderLoanCard = (loan) => (
    <div key={loan.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-white mb-1">{loan.lender}</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => handleEdit(loan)}
            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <SafeIcon icon={FiEdit2} className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(loan.id)}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <SafeIcon icon={FiTrash2} className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-gray-400 mb-1">Original Amount</p>
          <p className="text-white font-medium">{formatCurrency(loan.amount)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Current Balance</p>
          <p className="text-white font-medium">{formatCurrency(loan.currentBalance || loan.amount)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Interest Rate</p>
          <p className="text-white font-medium">{(loan.interest_rate * 100).toFixed(2)}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Monthly Payment</p>
          <p className="text-white font-medium">{formatCurrency(loan.monthly_payment || 0)}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {propertyId ? 'Property Loans' : 'Loan Management'}
          </h2>
          <p className="text-gray-400 mt-1">
            {propertyId ? 'Manage loans for this property' : 'Manage all property loans'}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <SafeIcon icon={FiPlus} className="w-4 h-4" />
          <span>Add Loan</span>
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-white mb-4">
              {editingLoan ? 'Edit Loan' : 'Add New Loan'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!propertyId && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Property *</label>
                  <select
                    name="propertyId"
                    value={formData.propertyId}
                    onChange={handleChange}
                    className={`form-select ${errors.propertyId ? 'border-red-500' : ''}`}
                  >
                    <option value="">Select Property</option>
                    {safeProperties.map(p => (
                      p && p.id ? (
                        <option key={p.id} value={p.id}>{p.address}</option>
                      ) : null
                    ))}
                  </select>
                  {errors.propertyId && <p className="text-red-400 text-sm mt-1">{errors.propertyId}</p>}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Lender *</label>
                <input
                  type="text"
                  name="lender"
                  value={formData.lender}
                  onChange={handleChange}
                  className={`form-input ${errors.lender ? 'border-red-500' : ''}`}
                  placeholder="Bank or lender name"
                />
                {errors.lender && <p className="text-red-400 text-sm mt-1">{errors.lender}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Loan Type</label>
                <select
                  name="loanType"
                  value={formData.loanType}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="conventional">Conventional</option>
                  <option value="fha">FHA</option>
                  <option value="va">VA</option>
                  <option value="usda">USDA</option>
                  <option value="jumbo">Jumbo</option>
                  <option value="hard_money">Hard Money</option>
                  <option value="private">Private</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Original Amount *</label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    className={`form-input ${errors.amount ? 'border-red-500' : ''}`}
                    placeholder="0"
                    step="0.01"
                    min="0"
                  />
                  {errors.amount && <p className="text-red-400 text-sm mt-1">{errors.amount}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Current Balance</label>
                  <input
                    type="number"
                    name="currentBalance"
                    value={formData.currentBalance}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Same as original"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Interest Rate (%) *</label>
                  <input
                    type="number"
                    name="interestRate"
                    value={formData.interestRate}
                    onChange={handleChange}
                    className={`form-input ${errors.interestRate ? 'border-red-500' : ''}`}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                  {errors.interestRate && <p className="text-red-400 text-sm mt-1">{errors.interestRate}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Loan Term (years) *</label>
                  <input
                    type="number"
                    name="termYears"
                    value={formData.termYears}
                    onChange={handleChange}
                    className={`form-input ${errors.termYears ? 'border-red-500' : ''}`}
                    placeholder="30"
                    min="1"
                  />
                  {errors.termYears && <p className="text-red-400 text-sm mt-1">{errors.termYears}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Monthly Payment</label>
                  <input
                    type="number"
                    name="monthlyPayment"
                    value={formData.monthlyPayment}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="0"
                    step="0.01"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Start Date *</label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    className={`form-input ${errors.startDate ? 'border-red-500' : ''}`}
                  />
                  {errors.startDate && <p className="text-red-400 text-sm mt-1">{errors.startDate}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="active">Active</option>
                  <option value="paid_off">Paid Off</option>
                  <option value="refinanced">Refinanced</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  {editingLoan ? 'Update Loan' : 'Add Loan'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loans Display */}
      <div className="space-y-4">
        {propertyId ? (
          // Single property view - show loans directly
          propertyLoans.length === 0 ? (
            <div className="text-center py-12">
              <SafeIcon icon={FiCreditCard} className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">No loans found</h3>
              <p className="text-gray-500">Add your first loan to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {propertyLoans.map(renderLoanCard)}
            </div>
          )
        ) : (
          // All properties view - show grouped by property
          Object.keys(groupedLoans).length === 0 ? (
            <div className="text-center py-12">
              <SafeIcon icon={FiCreditCard} className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">No loans found</h3>
              <p className="text-gray-500">Add your first loan to get started.</p>
            </div>
          ) : (
            Object.entries(groupedLoans).map(([propId, propLoans]) => {
              const stats = getPropertyLoanStats(propLoans);
              const isExpanded = expandedProperties.has(propId);

              return (
                <div key={propId} className="bg-gray-800 rounded-lg border border-gray-700">
                  <button
                    onClick={() => togglePropertyExpansion(propId)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-750 transition-colors rounded-t-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <SafeIcon
                        icon={isExpanded ? FiChevronDown : FiChevronRight}
                        className="w-5 h-5 text-gray-400"
                      />
                      <div className="text-left">
                        <h3 className="text-lg font-semibold text-white">{getPropertyName(propId)}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-400">
                          <span>{stats.active}/{stats.total} loans</span>
                          <span>{formatCurrency(stats.totalAmount)} total</span>
                          <span>{formatCurrency(stats.totalMonthly)}/mo</span>
                        </div>
                      </div>
                    </div>
                    <SafeIcon icon={FiCreditCard} className="w-6 h-6 text-gray-400" />
                  </button>

                  {isExpanded && (
                    <div className="p-4 pt-0 space-y-4">
                      {propLoans.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-gray-400">No loans for this property</p>
                        </div>
                      ) : (
                        propLoans.map(renderLoanCard)
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )
        )}
      </div>
    </div>
  );
}

export default LoanManager;
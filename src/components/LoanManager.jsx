import React, { useState, useMemo } from 'react';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { formatCurrency } from '../utils/number';

const { FiPlus, FiEdit2, FiTrash2, FiChevronDown, FiChevronRight, FiCreditCard } = FiIcons;

function LoanManager({ loans, properties, onSaveData, transactions, settings, propertyId, addNotification }) {
  const [showForm, setShowForm] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [expandedProperties, setExpandedProperties] = useState(new Set());

  // Safe defaults for all props
  const safeLoans = Array.isArray(loans) ? loans : [];
  const safeProperties = Array.isArray(properties) ? properties : [];
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeSettings = settings && typeof settings === 'object' ? settings : {};

  // Filter loans based on propertyId
  const propertyLoans = useMemo(
    () => (propertyId ? safeLoans.filter(l => l && l.propertyId === propertyId) : safeLoans),
    [safeLoans, propertyId]
  );

  // Group loans by property when no propertyId is provided
  const groupedLoans = useMemo(() => {
    if (propertyId) {
      return { [propertyId]: propertyLoans };
    } else {
      const grouped = {};
      safeLoans.forEach(loan => {
        if (loan && loan.propertyId) {
          if (!grouped[loan.propertyId]) {
            grouped[loan.propertyId] = [];
          }
          grouped[loan.propertyId].push(loan);
        }
      });
      return grouped;
    }
  }, [safeLoans, propertyId, propertyLoans]);

  const [formData, setFormData] = useState({
    propertyId: propertyId || '',
    lender: '',
    loanType: 'conventional',
    originalAmount: '',
    currentBalance: '',
    interestRate: '',
    loanTerm: '',
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
      originalAmount: '',
      currentBalance: '',
      interestRate: '',
      loanTerm: '',
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
    if (!formData.originalAmount || parseFloat(formData.originalAmount) <= 0) {
      newErrors.originalAmount = 'Original amount must be greater than 0';
    }
    if (!formData.interestRate || parseFloat(formData.interestRate) < 0) {
      newErrors.interestRate = 'Interest rate must be 0 or greater';
    }
    if (!formData.loanTerm || parseInt(formData.loanTerm) <= 0) {
      newErrors.loanTerm = 'Loan term must be greater than 0';
    }
    if (!formData.startDate) newErrors.startDate = 'Start date is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const loanData = {
        ...formData,
        id: editingLoan?.id || `loan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        originalAmount: parseFloat(formData.originalAmount),
        currentBalance: formData.currentBalance ? parseFloat(formData.currentBalance) : parseFloat(formData.originalAmount),
        interestRate: parseFloat(formData.interestRate),
        loanTerm: parseInt(formData.loanTerm),
        monthlyPayment: formData.monthlyPayment ? parseFloat(formData.monthlyPayment) : 0,
        createdAt: editingLoan?.createdAt || new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0]
      };

      const updatedLoans = editingLoan
        ? safeLoans.map(loan => loan.id === editingLoan.id ? loanData : loan)
        : [...safeLoans, loanData];

      // Create updated data object with all required fields
      const updatedData = {
        properties: safeProperties,
        loans: updatedLoans,
        transactions: safeTransactions,
        settings: safeSettings
      };

      onSaveData(updatedData);
      
      if (addNotification) {
        addNotification(
          editingLoan ? 'Loan updated successfully' : 'Loan added successfully',
          'success'
        );
      }
      
      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error('Error saving loan:', error);
      if (addNotification) {
        addNotification('Failed to save loan - please try again', 'error');
      }
    }
  };

  const handleEdit = (loan) => {
    setEditingLoan(loan);
    setFormData({
      propertyId: loan.propertyId,
      lender: loan.lender,
      loanType: loan.loanType,
      originalAmount: loan.originalAmount.toString(),
      currentBalance: loan.currentBalance.toString(),
      interestRate: loan.interestRate.toString(),
      loanTerm: loan.loanTerm.toString(),
      monthlyPayment: loan.monthlyPayment.toString(),
      startDate: loan.startDate,
      status: loan.status
    });
    setShowForm(true);
  };

  const handleDelete = (loanId) => {
    if (window.confirm('Are you sure you want to delete this loan?')) {
      try {
        const updatedLoans = safeLoans.filter(loan => loan.id !== loanId);
        
        const updatedData = {
          properties: safeProperties,
          loans: updatedLoans,
          transactions: safeTransactions,
          settings: safeSettings
        };

        onSaveData(updatedData);
        
        if (addNotification) {
          addNotification('Loan deleted successfully', 'success');
        }
      } catch (error) {
        console.error('Error deleting loan:', error);
        if (addNotification) {
          addNotification('Failed to delete loan - please try again', 'error');
        }
      }
    }
  };

  const getPropertyName = (propId) => {
    const property = safeProperties.find(p => p && p.id === propId);
    return property ? property.address : 'Unknown Property';
  };

  const getPropertyLoanStats = (propLoans) => {
    const activeLoans = propLoans.filter(loan => loan && loan.status === 'active');
    const totalAmount = activeLoans.reduce((sum, loan) => sum + (loan.currentBalance || loan.originalAmount), 0);
    const totalMonthly = activeLoans.reduce((sum, loan) => sum + (loan.monthlyPayment || 0), 0);
    
    return {
      active: activeLoans.length,
      total: propLoans.length,
      totalAmount,
      totalMonthly
    };
  };

  const renderLoanCard = (loan) => (
    <div key={loan.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">{loan.lender}</h3>
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <span className="capitalize">{loan.loanType}</span>
            <span className={`px-2 py-1 rounded text-xs ${
              loan.status === 'active' ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-300'
            }`}>
              {loan.status}
            </span>
          </div>
        </div>
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
          <p className="text-white font-medium">{formatCurrency(loan.originalAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Current Balance</p>
          <p className="text-white font-medium">{formatCurrency(loan.currentBalance || loan.originalAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Interest Rate</p>
          <p className="text-white font-medium">{loan.interestRate}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Monthly Payment</p>
          <p className="text-white font-medium">{formatCurrency(loan.monthlyPayment || 0)}</p>
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
                    name="originalAmount"
                    value={formData.originalAmount}
                    onChange={handleChange}
                    className={`form-input ${errors.originalAmount ? 'border-red-500' : ''}`}
                    placeholder="0"
                    step="0.01"
                    min="0"
                  />
                  {errors.originalAmount && <p className="text-red-400 text-sm mt-1">{errors.originalAmount}</p>}
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
                    name="loanTerm"
                    value={formData.loanTerm}
                    onChange={handleChange}
                    className={`form-input ${errors.loanTerm ? 'border-red-500' : ''}`}
                    placeholder="30"
                    min="1"
                  />
                  {errors.loanTerm && <p className="text-red-400 text-sm mt-1">{errors.loanTerm}</p>}
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
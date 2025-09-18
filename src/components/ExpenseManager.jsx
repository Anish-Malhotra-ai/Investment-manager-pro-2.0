import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { parseCurrency, formatForInput } from '../utils/number';
import { createExpense, updateExpense, deleteExpense, createTransaction } from '../utils/DataUtils';

const { FiPlus, FiEdit, FiTrash2, FiSave, FiX, FiReceipt, FiDollarSign, FiCalendar, FiTag, FiCopy } = FiIcons;

// FIXED: Inline tiny ID + transaction builder (no imports needed)
const __mkid = () => `tx_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
const __makeTx = ({ propertyId, amount, date=new Date(), category="", description="", type="expense", meta={} }) => ({
  id: __mkid(),
  propertyId,
  type,                       // "expense" | "income"
  category,
  description,
  amount: Number(amount),     // store numeric
  date: (date instanceof Date ? date : new Date(date)).toISOString(),
  ...meta,
});

const ExpenseManager = ({ property, properties, onSaveData, loans, transactions, settings }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({
    category: 'Maintenance',
    amount: '',
    date: '',
    description: '',
    vendor: '',
    deductible: true,
    notes: ''
  });
  const [errors, setErrors] = useState({});

  // Listen for external add expense events
  useEffect(() => {
    const handleAddExpense = () => {
      setShowAddForm(true);
    };

    window.addEventListener('addExpense', handleAddExpense);
    return () => window.removeEventListener('addExpense', handleAddExpense);
  }, []);

  const resetForm = () => {
    setFormData({
      category: 'Maintenance',
      amount: '',
      date: '',
      description: '',
      vendor: '',
      deductible: true,
      notes: ''
    });
    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    
    if (name === 'amount') {
      const sanitized = parseCurrency(value);
      setFormData(prev => ({ ...prev, [name]: formatForInput(sanitized) }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    const amount = parseCurrency(formData.amount);
    if (!amount || amount <= 0) {
      newErrors.amount = 'Valid expense amount is required';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const expenseData = {
        ...formData,
        amount: parseCurrency(formData.amount),
        propertyId: property.id
      };

      let savedExpense;
      if (editingExpense) {
        // Update existing expense in PocketBase
        const result = await updateExpense(editingExpense.id, expenseData);
        if (!result.success) {
          console.error('Failed to update expense:', result.error);
          return;
        }
        savedExpense = result.expense;
      } else {
        // Create new expense in PocketBase
        const result = await createExpense(expenseData);
        if (!result.success) {
          console.error('Failed to create expense:', result.error);
          return;
        }
        savedExpense = result.expense;
      }

      // Create corresponding transaction in PocketBase
      const transactionData = {
        propertyId: property.id,
        type: 'expense',
        category: expenseData.category,
        description: expenseData.description,
        amount: -Math.abs(expenseData.amount), // Expenses are negative
        date: expenseData.date,
        payee: expenseData.vendor || '',
        expenseId: savedExpense.id,
        deductible: expenseData.deductible,
        notes: expenseData.notes
      };

      await createTransaction(transactionData);

      // Trigger data refresh
      if (onSaveData) {
        onSaveData();
      }
      
      setShowAddForm(false);
      setEditingExpense(null);
      resetForm();
    } catch (error) {
      console.error('Error saving expense:', error);
    }
  };

  const handleEdit = (expense) => {
    setFormData({
      ...expense,
      amount: formatForInput(expense.amount)
    });
    setEditingExpense(expense);
    setShowAddForm(true);
  };

  const handleAddSimilar = (expense) => {
    // Pre-fill form with expense data but clear id and createdAt for new expense
    const similarExpenseData = {
      ...expense,
      amount: formatForInput(expense.amount),
      date: new Date().toISOString().split('T')[0], // Set to today's date
      description: `${expense.description} (Copy)` // Add "(Copy)" to description
    };
    
    // Remove id and createdAt to ensure it's treated as a new expense
    delete similarExpenseData.id;
    delete similarExpenseData.createdAt;
    
    setFormData(similarExpenseData);
    setEditingExpense(null); // Ensure we're in "add" mode, not "edit" mode
    setShowAddForm(true);
  };

  const handleDelete = async (expenseId) => {
    if (!confirm('Are you sure you want to delete this expense?')) {
      return;
    }

    try {
      // Delete expense from PocketBase
      const result = await deleteExpense(expenseId);
      if (!result.success) {
        console.error('Failed to delete expense:', result.error);
        return;
      }

      // Trigger data refresh
      if (onSaveData) {
        onSaveData();
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingExpense(null);
    resetForm();
  };

  const expenses = property.expenses || [];

  const categoryColors = {
    'Maintenance': 'bg-orange-900/30 text-orange-400',
    'Insurance': 'bg-blue-900/30 text-blue-400',
    'Property Management': 'bg-purple-900/30 text-purple-400',
    'Utilities': 'bg-yellow-900/30 text-yellow-400',
    'Legal & Professional': 'bg-green-900/30 text-green-400',
    'Marketing': 'bg-pink-900/30 text-pink-400',
    'Other': 'bg-gray-600/30 text-gray-400'
  };

  return (
    <div className="space-y-6">
      {/* Expenses List */}
      {expenses.length === 0 ? (
        <div className="card text-center py-12">
          <SafeIcon icon={FiReceipt} className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-400 mb-2">No Expenses Added</h3>
          <p className="text-gray-500 mb-6">Start by adding expense details for this property</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary"
          >
            Add Your First Expense
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {expenses.map((expense) => (
            <motion.div
              key={expense.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full bg-red-900/30 flex items-center justify-center">
                        <SafeIcon icon={FiReceipt} className="w-6 h-6 text-red-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{expense.description}</h3>
                        <p className="text-gray-400 text-sm">{expense.vendor || 'No vendor specified'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        categoryColors[expense.category] || categoryColors['Other']
                      }`}>
                        {expense.category}
                      </span>
                      {expense.deductible && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-900/50 text-green-400">
                          Tax Deductible
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-gray-400">Amount</p>
                      <p className="text-white font-medium text-lg">{formatForInput(expense.amount)}</p>
                    </div>

                    <div>
                      <p className="text-gray-400">Date</p>
                      <p className="text-white font-medium">
                        {new Date(expense.date).toLocaleDateString()}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-400">Category</p>
                      <p className="text-white font-medium">{expense.category}</p>
                    </div>
                  </div>

                  {expense.notes && (
                    <div className="mt-3 p-3 bg-gray-700/30 rounded">
                      <p className="text-gray-300 text-sm">{expense.notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => handleAddSimilar(expense)}
                    className="text-gray-400 hover:text-green-400 transition-colors"
                    title="Add Similar Expense"
                  >
                    <SafeIcon icon={FiCopy} className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(expense)}
                    className="text-gray-400 hover:text-blue-400 transition-colors"
                    title="Edit Expense"
                  >
                    <SafeIcon icon={FiEdit} className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                    title="Delete Expense"
                  >
                    <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={(e) => e.target === e.currentTarget && handleCancel()}
          >
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">
                  {editingExpense ? 'Edit Expense' : 'Add New Expense'}
                </h2>
                <button
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <SafeIcon icon={FiX} className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description *
                    </label>
                    <input
                      type="text"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      className={`form-input ${errors.description ? 'border-red-500' : ''}`}
                      placeholder="e.g., Plumbing repair"
                    />
                    {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Category
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="form-select"
                    >
                      <option value="Maintenance">Maintenance</option>
                      <option value="Insurance">Insurance</option>
                      <option value="Property Management">Property Management</option>
                      <option value="Utilities">Utilities</option>
                      <option value="Legal & Professional">Legal & Professional</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Amount *
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      name="amount"
                      value={formData.amount}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`form-input ${errors.amount ? 'border-red-500' : ''}`}
                      placeholder="150"
                    />
                    {errors.amount && <p className="text-red-400 text-sm mt-1">{errors.amount}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Date *
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      className={`form-input ${errors.date ? 'border-red-500' : ''}`}
                    />
                    {errors.date && <p className="text-red-400 text-sm mt-1">{errors.date}</p>}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Vendor/Supplier
                    </label>
                    <input
                      type="text"
                      name="vendor"
                      value={formData.vendor}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="e.g., ABC Plumbing Services"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="deductible"
                        checked={formData.deductible}
                        onChange={handleChange}
                        className="form-checkbox"
                      />
                      <span className="text-gray-300">Tax deductible expense</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows="3"
                    className="form-textarea"
                    placeholder="Additional notes about this expense..."
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={handleCancel}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="btn-primary flex-1 flex items-center justify-center space-x-2"
                  >
                    <SafeIcon icon={FiSave} className="w-4 h-4" />
                    <span>{editingExpense ? 'Update Expense' : 'Add Expense'}</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExpenseManager;
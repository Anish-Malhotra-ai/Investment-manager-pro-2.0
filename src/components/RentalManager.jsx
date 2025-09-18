import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { parseCurrency, formatForInput } from '../utils/number';
import { generateRentalTransactions } from '../utils/FinancialCalculations';
import { createRental, updateRental, deleteRental, createTransaction } from '../utils/DataUtils';

const { FiEdit, FiTrash2, FiX, FiUsers, FiCopy, FiBell, FiEye, FiCheck } = FiIcons;

const RentalManager = ({ property, properties, onSaveData, loans, transactions, settings }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRental, setEditingRental] = useState(null);
  const [showSchedulePreview, setShowSchedulePreview] = useState(false);
  const [scheduleData, setScheduleData] = useState([]);
  const [formData, setFormData] = useState({
    tenantName: '',
    roomDescription: '',
    amount: '',
    frequency: 'Weekly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    bondAmount: '',
    notes: '',
    reminderDate: '',
    managementFeePercentage: ''
  });
  const [errors, setErrors] = useState({});

  // Listen for external add rental events
  useEffect(() => {
    const handleAddRental = () => {
      setShowAddForm(true);
    };

    window.addEventListener('addRental', handleAddRental);
    return () => window.removeEventListener('addRental', handleAddRental);
  }, []);

  // Global keydown handler to prevent backspace navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Backspace' && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        e.stopPropagation();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const resetForm = () => {
    setFormData({
      tenantName: '',
      roomDescription: '',
      amount: '',
      frequency: 'Weekly',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      bondAmount: '',
      notes: '',
      reminderDate: '',
      managementFeePercentage: ''
    });
    setErrors({});
    setScheduleData([]);
    setShowSchedulePreview(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    
    if (['amount', 'bondAmount', 'managementFeePercentage'].includes(name)) {
      const sanitized = parseCurrency(value);
      let formatted;
      
      if (name === 'managementFeePercentage') {
        formatted = sanitized > 0 ? sanitized.toString() : '';
      } else {
        formatted = sanitized > 0 ? formatForInput(sanitized) : '';
      }
      
      setFormData(prev => ({ ...prev, [name]: formatted }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.tenantName.trim()) {
      newErrors.tenantName = 'Tenant name is required';
    }

    const amount = parseCurrency(formData.amount);
    if (!amount || amount <= 0) {
      newErrors.amount = 'Valid rental amount is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateRentalSchedule = () => {
    if (!validateForm()) return;

    const rentalData = {
      id: editingRental?.id || Date.now().toString(),
      tenantName: formData.tenantName,
      amount: parseCurrency(formData.amount),
      frequency: formData.frequency,
      startDate: formData.startDate,
      endDate: formData.endDate || '',
      managementFeePercentage: parseCurrency(formData.managementFeePercentage)
    };

    // Generate schedule using FinancialCalculations
    const dailyTransactions = generateRentalTransactions(property, {
      ...rentalData,
      leaseStartDate: rentalData.startDate,
      leaseEndDate: rentalData.endDate || new Date(new Date(rentalData.startDate).getFullYear() + 1, new Date(rentalData.startDate).getMonth(), new Date(rentalData.start).getDate()).toISOString().split('T')[0]
    });

    // Group by month for preview
    const monthlySchedule = {};
    dailyTransactions.forEach(transaction => {
      const monthKey = transaction.date.substring(0, 7); // YYYY-MM
      if (!monthlySchedule[monthKey]) {
        monthlySchedule[monthKey] = {
          month: monthKey,
          totalIncome: 0,
          totalExpenses: 0,
          transactions: []
        };
      }
      
      if (transaction.type === 'income') {
        monthlySchedule[monthKey].totalIncome += transaction.amount;
      } else {
        monthlySchedule[monthKey].totalExpenses += transaction.amount;
      }
      
      monthlySchedule[monthKey].transactions.push(transaction);
    });

    const schedule = Object.values(monthlySchedule).sort((a, b) => a.month.localeCompare(b.month));
    setScheduleData(schedule);
    setShowSchedulePreview(true);
  };

  const confirmRentalSchedule = async () => {
    if (!validateForm()) return;

    try {
      const rentalData = {
        ...formData,
        amount: parseCurrency(formData.amount),
        bondAmount: parseCurrency(formData.bondAmount),
        managementFeePercentage: parseCurrency(formData.managementFeePercentage),
        reminderDate: formData.reminderDate || null,
        propertyId: property.id
      };

      let savedRental;
      if (editingRental) {
        // Update existing rental in PocketBase
        const result = await updateRental(editingRental.id, rentalData);
        if (!result.success) {
          console.error('Failed to update rental:', result.error);
          return;
        }
        savedRental = result.rental;
      } else {
        // Create new rental in PocketBase
        const result = await createRental(rentalData);
        if (!result.success) {
          console.error('Failed to create rental:', result.error);
          return;
        }
        savedRental = result.rental;
      }

      // Generate daily transactions for the rental
      const newTransactions = generateRentalTransactions(property, {
        ...savedRental,
        leaseStartDate: savedRental.startDate,
        leaseEndDate: savedRental.endDate || new Date(new Date(savedRental.startDate).getFullYear() + 1, new Date(savedRental.startDate).getMonth(), new Date(savedRental.startDate).getDate()).toISOString().split('T')[0]
      });

      // Create transactions in PocketBase
      for (const transaction of newTransactions) {
        await createTransaction({
          ...transaction,
          rentalId: savedRental.id
        });
      }

      // Trigger data refresh
      if (onSaveData) {
        onSaveData();
      }
      
      setShowAddForm(false);
      setEditingRental(null);
      resetForm();
    } catch (error) {
      console.error('Error saving rental:', error);
    }
  };

  const handleEdit = (rental) => {
    setFormData({
      ...rental,
      amount: formatForInput(rental.amount),
      bondAmount: formatForInput(rental.bondAmount || 0),
      managementFeePercentage: rental.managementFeePercentage?.toString() || '',
      reminderDate: rental.reminderDate || ''
    });
    setEditingRental(rental);
    setShowAddForm(true);
  };

  const handleAddSimilar = (rental) => {
    setFormData({
      ...rental,
      id: undefined,
      tenantName: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      reminderDate: '',
      amount: formatForInput(rental.amount),
      bondAmount: formatForInput(rental.bondAmount || 0),
      managementFeePercentage: rental.managementFeePercentage?.toString() || ''
    });
    setEditingRental(null);
    setShowAddForm(true);
  };

  const handleDelete = async (rentalId) => {
    if (!confirm('Are you sure you want to delete this rental? This will also remove all associated transactions.')) {
      return;
    }

    try {
      // Delete rental from PocketBase
      const result = await deleteRental(rentalId);
      if (!result.success) {
        console.error('Failed to delete rental:', result.error);
        return;
      }

      // Trigger data refresh
      if (onSaveData) {
        onSaveData();
      }
    } catch (error) {
      console.error('Error deleting rental:', error);
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingRental(null);
    resetForm();
  };

  const isRentalActive = (rental) => {
    const today = new Date();
    const startDate = new Date(rental.startDate);
    const endDate = rental.endDate ? new Date(rental.endDate) : null;
    
    return today >= startDate && (!endDate || today <= endDate);
  };

  const rentals = property.rentals || [];

  return (
    <div className="space-y-6">
      {/* Rentals List */}
      {rentals.length === 0 ? (
        <div className="card text-center py-12">
          <SafeIcon icon={FiUsers} className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-400 mb-2">No Rentals Added</h3>
          <p className="text-gray-500 mb-6">Start by adding rental details for this property</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary"
          >
            Add Your First Rental
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {rentals.map((rental) => (
            <motion.div
              key={rental.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`card border-l-4 ${
                isRentalActive(rental) ? 'border-green-500' : 'border-gray-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full bg-blue-900/30 flex items-center justify-center">
                        <SafeIcon icon={FiUsers} className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{rental.tenantName}</h3>
                        {rental.roomDescription && (
                          <p className="text-gray-400 text-sm">{rental.roomDescription}</p>
                        )}
                        {rental.reminderDate && (
                          <div className="text-xs text-yellow-400 flex items-center mt-1">
                            <SafeIcon icon={FiBell} className="w-3 h-3 mr-1" />
                            Reminder: {new Date(rental.reminderDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      isRentalActive(rental)
                        ? 'bg-green-900/50 text-green-400'
                        : 'bg-gray-600/50 text-gray-400'
                    }`}>
                      {isRentalActive(rental) ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-gray-400">Rental Amount</p>
                      <p className="text-white font-medium">
                        {formatForInput(rental.amount)} {rental.frequency}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-400">Start Date</p>
                      <p className="text-white font-medium">
                        {new Date(rental.startDate).toLocaleDateString()}
                      </p>
                    </div>

                    {rental.endDate && (
                      <div>
                        <p className="text-gray-400">End Date</p>
                        <p className="text-white font-medium">
                          {new Date(rental.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}

                    {rental.bondAmount > 0 && (
                      <div>
                        <p className="text-gray-400">Bond Amount</p>
                        <p className="text-white font-medium">{formatForInput(rental.bondAmount)}</p>
                      </div>
                    )}

                    {rental.managementFeePercentage > 0 && (
                      <div>
                        <p className="text-gray-400">Management Fee</p>
                        <p className="text-white font-medium">{rental.managementFeePercentage}%</p>
                      </div>
                    )}
                  </div>

                  {rental.notes && (
                    <div className="mt-3 p-3 bg-gray-700/30 rounded">
                      <p className="text-gray-300 text-sm">{rental.notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => handleAddSimilar(rental)}
                    className="text-gray-400 hover:text-green-400 transition-colors"
                    title="Add Similar"
                  >
                    <SafeIcon icon={FiCopy} className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(rental)}
                    className="text-gray-400 hover:text-blue-400 transition-colors"
                  >
                    <SafeIcon icon={FiEdit} className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(rental.id)}
                    className="text-gray-400 hover:text-red-400 transition-colors"
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
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">
                  {editingRental ? 'Edit Rental' : 'Add New Rental'}
                </h2>
                <button
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <SafeIcon icon={FiX} className="w-6 h-6" />
                </button>
              </div>

              {!showSchedulePreview ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Tenant Name *
                      </label>
                      <input
                        type="text"
                        name="tenantName"
                        value={formData.tenantName}
                        onChange={handleChange}
                        className={`form-input ${errors.tenantName ? 'border-red-500' : ''}`}
                        placeholder="e.g., John Smith"
                      />
                      {errors.tenantName && <p className="text-red-400 text-sm mt-1">{errors.tenantName}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Room/Space Description
                      </label>
                      <input
                        type="text"
                        name="roomDescription"
                        value={formData.roomDescription}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="e.g., Master Bedroom, Entire Property"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Rental Amount *
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        name="amount"
                        value={formData.amount}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`form-input ${errors.amount ? 'border-red-500' : ''}`}
                        placeholder="450"
                      />
                      {errors.amount && <p className="text-red-400 text-sm mt-1">{errors.amount}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Payment Frequency
                      </label>
                      <select
                        name="frequency"
                        value={formData.frequency}
                        onChange={handleChange}
                        className="form-select"
                      >
                        <option value="Weekly">Weekly</option>
                        <option value="Fortnightly">Fortnightly</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleChange}
                        className={`form-input ${errors.startDate ? 'border-red-500' : ''}`}
                      />
                      {errors.startDate && <p className="text-red-400 text-sm mt-1">{errors.startDate}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        End Date (Optional)
                      </label>
                      <input
                        type="date"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleChange}
                        className="form-input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Bond Amount
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        name="bondAmount"
                        value={formData.bondAmount}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className="form-input"
                        placeholder="1800"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Management Fee (%)
                      </label>
                      <input
                        type="text"
                        name="managementFeePercentage"
                        value={formData.managementFeePercentage}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className="form-input"
                        placeholder="7.5"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        <SafeIcon icon={FiBell} className="w-4 h-4 inline mr-1" />
                        Reminder Date (Optional)
                      </label>
                      <input
                        type="date"
                        name="reminderDate"
                        value={formData.reminderDate}
                        onChange={handleChange}
                        className="form-input"
                      />
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
                      placeholder="Additional notes about this rental..."
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
                      onClick={generateRentalSchedule}
                      className="btn-primary flex-1 flex items-center justify-center space-x-2"
                    >
                      <SafeIcon icon={FiEye} className="w-4 h-4" />
                      <span>Preview Schedule</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-blue-400 mb-2">Rental Schedule Preview</h3>
                    <p className="text-gray-300 text-sm">
                      This shows how daily transactions will be generated for {formData.tenantName} from {formData.startDate} to {formData.endDate || 'ongoing'}.
                    </p>
                  </div>

                  <div className="max-h-96 overflow-y-auto space-y-3">
                    {scheduleData.map((monthData) => (
                      <div key={monthData.month} className="bg-gray-700/50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-white">
                            {new Date(monthData.month + '-01').toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long' 
                            })}
                          </h4>
                          <div className="text-sm space-x-4">
                            <span className="text-green-400">
                              Income: {formatForInput(monthData.totalIncome)}
                            </span>
                            {monthData.totalExpenses > 0 && (
                              <span className="text-red-400">
                                Expenses: {formatForInput(monthData.totalExpenses)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-gray-400">
                          {monthData.transactions.length} daily transactions generated
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={() => setShowSchedulePreview(false)}
                      className="btn-secondary flex-1"
                    >
                      Back to Edit
                    </button>
                    <button
                      onClick={confirmRentalSchedule}
                      className="btn-primary flex-1 flex items-center justify-center space-x-2"
                    >
                      <SafeIcon icon={FiCheck} className="w-4 h-4" />
                      <span>Confirm & Save Rental</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RentalManager;
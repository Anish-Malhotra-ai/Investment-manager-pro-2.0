import React, { useState } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { parseCurrency, formatForInput } from '../utils/number';

const { FiEdit, FiSave, FiX, FiHome, FiCalendar, FiDollarSign, FiFileText, FiPlus, FiTrash2 } = FiIcons;

const PropertyInfo = ({ property, properties, onSaveData, loans, transactions, settings }) => {
  const [isEditing, setIsEditing] = useState(false);
  
  // Initialize form data with acquisition costs
  const initializeFormData = () => ({
    name: property.name || '',
    address: property.address || '',
    basePropertyCost: property.basePropertyCost || property.purchasePrice || 0,
    purchaseDate: property.purchaseDate || '',
    currentValue: property.currentValue || property.purchasePrice || 0,
    propertyType: property.propertyType || 'Residential',
    notes: property.notes || '',
    acquisitionCosts: Array.isArray(property.acquisitionCosts) 
      ? property.acquisitionCosts.map(cost => ({ ...cost }))
      : []
  });

  const [formData, setFormData] = useState(initializeFormData());
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    // Allow typing with commas and periods
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleNumberBlur = (e) => {
    const { name, value } = e.target;
    if (['basePropertyCost', 'currentValue'].includes(name)) {
      const sanitized = parseCurrency(value);
      setFormData(prev => ({ ...prev, [name]: formatForInput(sanitized) }));
    }
  };

  // Acquisition costs handlers
  const handleAcquisitionCostChange = (index, field, value) => {
    const updatedCosts = [...formData.acquisitionCosts];
    updatedCosts[index] = { ...updatedCosts[index], [field]: value };
    setFormData(prev => ({ ...prev, acquisitionCosts: updatedCosts }));
  };

  const handleAcquisitionCostBlur = (index) => {
    const updatedCosts = [...formData.acquisitionCosts];
    const sanitized = parseCurrency(updatedCosts[index].amount);
    updatedCosts[index] = { ...updatedCosts[index], amount: formatForInput(sanitized) };
    setFormData(prev => ({ ...prev, acquisitionCosts: updatedCosts }));
  };

  const addAcquisitionCost = () => {
    const newCost = {
      id: `acq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category: '',
      amount: '',
      notes: ''
    };
    setFormData(prev => ({
      ...prev,
      acquisitionCosts: [...prev.acquisitionCosts, newCost]
    }));
  };

  const removeAcquisitionCost = (index) => {
    const updatedCosts = formData.acquisitionCosts.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, acquisitionCosts: updatedCosts }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Property name is required';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (!formData.basePropertyCost || parseCurrency(formData.basePropertyCost) <= 0) {
      newErrors.basePropertyCost = 'Valid purchase price is required';
    }

    if (!formData.purchaseDate) {
      newErrors.purchaseDate = 'Purchase date is required';
    }

    if (formData.currentValue && parseCurrency(formData.currentValue) <= 0) {
      newErrors.currentValue = 'Current value must be greater than 0';
    }

    // Validate acquisition costs
    formData.acquisitionCosts.forEach((cost, index) => {
      if (cost.category && !cost.category.trim()) {
        newErrors[`acquisitionCost_${index}_category`] = 'Category is required';
      }
      if (cost.amount && parseCurrency(cost.amount) <= 0) {
        newErrors[`acquisitionCost_${index}_amount`] = 'Valid amount is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    const sanitizedBasePropertyCost = parseCurrency(formData.basePropertyCost);
    const sanitizedCurrentValue = parseCurrency(formData.currentValue);

    // Sanitize acquisition costs
    const sanitizedAcquisitionCosts = formData.acquisitionCosts
      .filter(cost => cost.category && cost.category.trim()) // Only include costs with categories
      .map(cost => ({
        ...cost,
        category: cost.category.trim(),
        amount: parseCurrency(cost.amount),
        notes: cost.notes ? cost.notes.trim() : ''
      }));

    const updatedProperty = {
      ...property,
      name: formData.name.trim(),
      address: formData.address.trim(),
      basePropertyCost: sanitizedBasePropertyCost,
      purchasePrice: sanitizedBasePropertyCost, // Keep both for compatibility
      purchaseDate: formData.purchaseDate,
      currentValue: sanitizedCurrentValue,
      propertyType: formData.propertyType,
      notes: formData.notes.trim(),
      acquisitionCosts: sanitizedAcquisitionCosts,
      updatedAt: new Date().toISOString()
    };

    const updatedProperties = properties.map(p => 
      p.id === property.id ? updatedProperty : p
    );

    await onSaveData({ properties: updatedProperties, loans, transactions, settings });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(initializeFormData());
    setErrors({});
    setIsEditing(false);
  };

  // Calculate acquisition costs and totals
  const acquisitionCosts = property.acquisitionCosts || [];
  const totalAcquisitionCosts = acquisitionCosts.reduce((sum, cost) => {
    const amount = typeof cost.amount === 'number' ? cost.amount : parseCurrency(cost.amount);
    return sum + amount;
  }, 0);
  
  const basePropertyCost = typeof property.basePropertyCost === 'number' ? property.basePropertyCost : parseCurrency(property.basePropertyCost || property.purchasePrice);
  const currentValue = typeof property.currentValue === 'number' ? property.currentValue : parseCurrency(property.currentValue || property.purchasePrice);
  const totalPurchasePrice = basePropertyCost + totalAcquisitionCosts;
  const valueChange = currentValue - basePropertyCost;
  const valueChangePercentage = basePropertyCost > 0 ? (valueChange / basePropertyCost * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Property Information Card */}
      <div className="card">
        <div className="card-header flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <SafeIcon icon={FiHome} className="w-5 h-5 mr-2" />
            Property Information
          </h3>
          <div className="flex items-center space-x-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="btn-secondary flex items-center space-x-2"
              >
                <SafeIcon icon={FiEdit} className="w-4 h-4" />
                <span>Edit</span>
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={handleSave}
                  className="btn-primary flex items-center space-x-2"
                >
                  <SafeIcon icon={FiSave} className="w-4 h-4" />
                  <span>Save</span>
                </button>
                <button
                  onClick={handleCancel}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <SafeIcon icon={FiX} className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {isEditing ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Basic Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Property Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`form-input ${errors.name ? 'border-red-500' : ''}`}
                  placeholder="e.g., Sunshine Apartment"
                />
                {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Property Type
                </label>
                <select
                  name="propertyType"
                  value={formData.propertyType}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="Residential">Residential</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Industrial">Industrial</option>
                  <option value="Land">Land</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Address *
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className={`form-input ${errors.address ? 'border-red-500' : ''}`}
                  placeholder="e.g., 123 Collins Street, Melbourne VIC 3000"
                />
                {errors.address && <p className="text-red-400 text-sm mt-1">{errors.address}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Purchase Date *
                </label>
                <input
                  type="date"
                  name="purchaseDate"
                  value={formData.purchaseDate}
                  onChange={handleChange}
                  className={`form-input ${errors.purchaseDate ? 'border-red-500' : ''}`}
                />
                {errors.purchaseDate && <p className="text-red-400 text-sm mt-1">{errors.purchaseDate}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Purchase Price (Base Cost) *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  name="basePropertyCost"
                  value={formData.basePropertyCost}
                  onChange={handleNumberChange}
                  onBlur={handleNumberBlur}
                  className={`form-input ${errors.basePropertyCost ? 'border-red-500' : ''}`}
                  placeholder="e.g., 450000"
                />
                {errors.basePropertyCost && <p className="text-red-400 text-sm mt-1">{errors.basePropertyCost}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Current Value
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  name="currentValue"
                  value={formData.currentValue}
                  onChange={handleNumberChange}
                  onBlur={handleNumberBlur}
                  className={`form-input ${errors.currentValue ? 'border-red-500' : ''}`}
                  placeholder="Current market value"
                />
                {errors.currentValue && <p className="text-red-400 text-sm mt-1">{errors.currentValue}</p>}
              </div>
            </div>

            {/* Acquisition Costs Section */}
            <div className="bg-gray-700/30 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-white font-medium flex items-center">
                  <SafeIcon icon={FiFileText} className="w-4 h-4 mr-2" />
                  Acquisition Costs
                </h4>
                <button
                  type="button"
                  onClick={addAcquisitionCost}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <SafeIcon icon={FiPlus} className="w-4 h-4" />
                  <span>Add Cost</span>
                </button>
              </div>

              <div className="space-y-4">
                {formData.acquisitionCosts.map((cost, index) => (
                  <div key={cost.id || index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-600/30 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Category *
                      </label>
                      <input
                        type="text"
                        value={cost.category}
                        onChange={(e) => handleAcquisitionCostChange(index, 'category', e.target.value)}
                        className={`form-input ${errors[`acquisitionCost_${index}_category`] ? 'border-red-500' : ''}`}
                        placeholder="e.g., Stamp Duty, Legal Fees"
                      />
                      {errors[`acquisitionCost_${index}_category`] && (
                        <p className="text-red-400 text-sm mt-1">{errors[`acquisitionCost_${index}_category`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Amount *
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={cost.amount}
                        onChange={(e) => handleAcquisitionCostChange(index, 'amount', e.target.value)}
                        onBlur={() => handleAcquisitionCostBlur(index)}
                        className={`form-input ${errors[`acquisitionCost_${index}_amount`] ? 'border-red-500' : ''}`}
                        placeholder="e.g., 15000"
                      />
                      {errors[`acquisitionCost_${index}_amount`] && (
                        <p className="text-red-400 text-sm mt-1">{errors[`acquisitionCost_${index}_amount`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Notes
                      </label>
                      <input
                        type="text"
                        value={cost.notes || ''}
                        onChange={(e) => handleAcquisitionCostChange(index, 'notes', e.target.value)}
                        className="form-input"
                        placeholder="Optional notes"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeAcquisitionCost(index)}
                        className="btn-danger w-full flex items-center justify-center space-x-2"
                      >
                        <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ))}

                {formData.acquisitionCosts.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <SafeIcon icon={FiFileText} className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No acquisition costs added yet</p>
                    <p className="text-sm">Click "Add Cost" to include stamp duty, legal fees, etc.</p>
                  </div>
                )}
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
                rows="4"
                className="form-textarea"
                placeholder="Any additional notes about this property..."
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Property Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <SafeIcon icon={FiHome} className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Property Name</p>
                  <p className="text-white font-medium">{property.name}</p>
                  <p className="text-gray-500 text-xs mt-1">{property.propertyType || 'Residential'}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-full bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <SafeIcon icon={FiDollarSign} className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Purchase Price</p>
                  <p className="text-white font-medium">{formatForInput(basePropertyCost)}</p>
                  {totalAcquisitionCosts > 0 && (
                    <p className="text-gray-500 text-xs mt-1">
                      + {formatForInput(totalAcquisitionCosts)} acquisition costs
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-full bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                  <SafeIcon icon={FiCalendar} className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Purchase Date</p>
                  <p className="text-white font-medium">
                    {property.purchaseDate ? new Date(property.purchaseDate).toLocaleDateString() : 'Not specified'}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-full bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                  <SafeIcon icon={FiDollarSign} className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Current Value</p>
                  <p className="text-white font-medium">
                    {formatForInput(currentValue)}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-full bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                  <SafeIcon icon={FiDollarSign} className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Investment</p>
                  <p className="text-white font-medium">{formatForInput(totalPurchasePrice)}</p>
                  <p className="text-gray-500 text-xs mt-1">Including all costs</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-full bg-cyan-900/30 flex items-center justify-center flex-shrink-0">
                  <SafeIcon icon={FiDollarSign} className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Value Change</p>
                  <p className={`font-medium ${valueChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatForInput(valueChange)}
                  </p>
                  <p className={`text-xs mt-1 ${valueChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {valueChangePercentage.toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h4 className="text-white font-medium mb-2">Address</h4>
              <p className="text-gray-300">{property.address}</p>
            </div>

            {/* Notes */}
            {property.notes && (
              <div className="bg-gray-700/30 rounded-lg p-4">
                <h4 className="text-white font-medium mb-2 flex items-center">
                  <SafeIcon icon={FiFileText} className="w-4 h-4 mr-2" />
                  Notes
                </h4>
                <p className="text-gray-300 whitespace-pre-wrap">{property.notes}</p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default PropertyInfo;
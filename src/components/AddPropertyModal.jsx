import React, { useState } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { parseCurrency, formatForInput } from '../utils/number';

const { FiX, FiHome, FiPlus, FiTrash2 } = FiIcons;

const AddPropertyModal = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    suburb: '',
    state: '',
    postcode: '',
    basePropertyCost: '',
    currentValue: '',
    purchaseDate: '',
    propertyType: 'Residential',
    bedrooms: '',
    bathrooms: '',
    notes: '',
    acquisitionCosts: []
  });
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

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const sanitizedBasePropertyCost = parseCurrency(formData.basePropertyCost);
    const sanitizedCurrentValue = parseCurrency(formData.currentValue);

    // Sanitize acquisition costs
    const sanitizedAcquisitionCosts = formData.acquisitionCosts
      .filter(cost => cost.category && cost.category.trim())
      .map(cost => ({
        ...cost,
        category: cost.category.trim(),
        amount: parseCurrency(cost.amount),
        notes: cost.notes ? cost.notes.trim() : ''
      }));

    const propertyData = {
      id: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: formData.name.trim(),
      address: formData.address.trim(),
      suburb: formData.suburb.trim(),
      state: formData.state.trim(),
      postcode: formData.postcode.trim(),
      basePropertyCost: sanitizedBasePropertyCost,
      purchasePrice: sanitizedBasePropertyCost, // Keep both for compatibility
      currentValue: sanitizedCurrentValue || sanitizedBasePropertyCost,
      purchaseDate: formData.purchaseDate,
      propertyType: formData.propertyType,
      bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
      bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
      notes: formData.notes.trim(),
      acquisitionCosts: sanitizedAcquisitionCosts,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(propertyData);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      name: '',
      address: '',
      suburb: '',
      state: '',
      postcode: '',
      basePropertyCost: '',
      currentValue: '',
      purchaseDate: '',
      propertyType: 'Residential',
      bedrooms: '',
      bathrooms: '',
      notes: '',
      acquisitionCosts: []
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gray-800 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <SafeIcon icon={FiHome} className="w-6 h-6 mr-3 text-blue-400" />
            Add New Property
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <SafeIcon icon={FiX} className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Property Information */}
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
                placeholder="e.g., 123 Collins Street"
              />
              {errors.address && <p className="text-red-400 text-sm mt-1">{errors.address}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Suburb
              </label>
              <input
                type="text"
                name="suburb"
                value={formData.suburb}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g., Melbourne"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                State
              </label>
              <select
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="form-select"
              >
                <option value="">Select State</option>
                <option value="NSW">NSW</option>
                <option value="VIC">VIC</option>
                <option value="QLD">QLD</option>
                <option value="WA">WA</option>
                <option value="SA">SA</option>
                <option value="TAS">TAS</option>
                <option value="ACT">ACT</option>
                <option value="NT">NT</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Postcode
              </label>
              <input
                type="text"
                name="postcode"
                value={formData.postcode}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g., 3000"
              />
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

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bedrooms
              </label>
              <input
                type="number"
                name="bedrooms"
                value={formData.bedrooms}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g., 3"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bathrooms
              </label>
              <input
                type="number"
                name="bathrooms"
                value={formData.bathrooms}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g., 2"
                min="0"
                step="0.5"
              />
            </div>
          </div>

          {/* Acquisition Costs Section */}
          <div className="bg-gray-700/30 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-white font-medium">Acquisition Costs</h4>
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
                  <p>No acquisition costs added yet</p>
                  <p className="text-sm">Click "Add Cost" to include stamp duty, legal fees, etc.</p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
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

          {/* Form Actions */}
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
            >
              Add Property
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default AddPropertyModal;
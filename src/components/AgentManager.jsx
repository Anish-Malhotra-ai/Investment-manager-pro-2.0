import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { createAgent, updateAgent, deleteAgent } from '../utils/DataUtils';

const { FiEdit, FiTrash2, FiSave, FiX, FiUser, FiMail, FiPhone, FiMapPin } = FiIcons;

const AgentManager = ({ property, properties, onSaveData, loans, transactions, settings }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    role: 'Property Manager',
    company: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});

  // Listen for external add agent events
  useEffect(() => {
    const handleAddAgent = () => {
      setShowAddForm(true);
    };

    window.addEventListener('addAgent', handleAddAgent);
    return () => window.removeEventListener('addAgent', handleAddAgent);
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      role: 'Property Manager',
      company: '',
      email: '',
      phone: '',
      address: '',
      notes: ''
    });
    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Agent name is required';
    }

    if (formData.email && !formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = 'Valid email address is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const agentData = {
        ...formData,
        propertyId: property.id
      };

      let result;
      if (editingAgent) {
        // Update existing agent in PocketBase
        result = await updateAgent(editingAgent.id, agentData);
        if (!result.success) {
          console.error('Failed to update agent:', result.error);
          return;
        }
      } else {
        // Create new agent in PocketBase
        result = await createAgent(agentData);
        if (!result.success) {
          console.error('Failed to create agent:', result.error);
          return;
        }
      }

      // Trigger data refresh
      if (onSaveData) {
        onSaveData();
      }
      
      setShowAddForm(false);
      setEditingAgent(null);
      resetForm();
    } catch (error) {
      console.error('Error saving agent:', error);
    }
  };

  const handleEdit = (agent) => {
    setFormData({ ...agent });
    setEditingAgent(agent);
    setShowAddForm(true);
  };

  const handleDelete = async (agentId) => {
    if (!confirm('Are you sure you want to delete this agent?')) {
      return;
    }

    try {
      // Delete agent from PocketBase
      const result = await deleteAgent(agentId);
      if (!result.success) {
        console.error('Failed to delete agent:', result.error);
        return;
      }

      // Trigger data refresh
      if (onSaveData) {
        onSaveData();
      }
    } catch (error) {
      console.error('Error deleting agent:', error);
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingAgent(null);
    resetForm();
  };

  const agents = property.agents || [];

  return (
    <div className="space-y-6">
      {/* Agents List */}
      {agents.length === 0 ? (
        <div className="card text-center py-12">
          <SafeIcon icon={FiUser} className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-400 mb-2">No Agents Added</h3>
          <p className="text-gray-500 mb-6">Start by adding agent details for this property</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary"
          >
            Add Your First Agent
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {agents.map((agent) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-blue-900/30 flex items-center justify-center">
                      <SafeIcon icon={FiUser} className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{agent.name}</h3>
                      <p className="text-gray-400 text-sm">{agent.role}</p>
                      {agent.company && (
                        <p className="text-gray-500 text-xs">{agent.company}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {agent.email && (
                      <div className="flex items-center space-x-2">
                        <SafeIcon icon={FiMail} className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">{agent.email}</span>
                      </div>
                    )}

                    {agent.phone && (
                      <div className="flex items-center space-x-2">
                        <SafeIcon icon={FiPhone} className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">{agent.phone}</span>
                      </div>
                    )}

                    {agent.address && (
                      <div className="flex items-center space-x-2 md:col-span-2">
                        <SafeIcon icon={FiMapPin} className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">{agent.address}</span>
                      </div>
                    )}
                  </div>

                  {agent.notes && (
                    <div className="mt-3 p-3 bg-gray-700/30 rounded">
                      <p className="text-gray-300 text-sm">{agent.notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => handleEdit(agent)}
                    className="text-gray-400 hover:text-blue-400 transition-colors"
                  >
                    <SafeIcon icon={FiEdit} className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(agent.id)}
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
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">
                  {editingAgent ? 'Edit Agent' : 'Add New Agent'}
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
                      Agent Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={`form-input ${errors.name ? 'border-red-500' : ''}`}
                      placeholder="e.g., John Smith"
                    />
                    {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Role
                    </label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className="form-select"
                    >
                      <option value="Property Manager">Property Manager</option>
                      <option value="Real Estate Agent">Real Estate Agent</option>
                      <option value="Leasing Agent">Leasing Agent</option>
                      <option value="Maintenance Coordinator">Maintenance Coordinator</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Company
                    </label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="e.g., ABC Real Estate"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`form-input ${errors.email ? 'border-red-500' : ''}`}
                      placeholder="agent@company.com"
                    />
                    {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="(02) 1234 5678"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Address
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="Office address"
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
                    placeholder="Additional notes about this agent..."
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
                    <span>{editingAgent ? 'Update Agent' : 'Add Agent'}</span>
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

export default AgentManager;
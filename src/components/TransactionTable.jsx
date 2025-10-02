import React, { useState, useMemo, useEffect, useCallback } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import * as DateUtils from '../utils/DateUtils';
import DataManager from '../services/DataManager';
import { formatCurrency, sanitize } from '../utils/number';
import { generateRentalTransactions, generateLoanPayments, calculateDailyAmount } from '../utils/FinancialCalculations';

const { 
  FiFilter, 
  FiChevronUp, 
  FiChevronDown, 
  FiDollarSign, 
  FiTag, 
  FiDownload, 
  FiCalendar, 
  FiCopy, 
  FiBell, 
  FiList, 
  FiBarChart3, 
  FiToggleLeft, 
  FiToggleRight, 
  FiHome,
  FiTrendingUp,
  FiTrendingDown
} = FiIcons;

// Helper functions with error handling
const toNum = (v) => {
  try {
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
    const s = String(v ?? "");
    const n = s.replace(/[^\d.-]/g, "");
    const f = parseFloat(n);
    return Number.isFinite(f) ? f : 0;
  } catch (error) {
    console.warn('toNum error:', error);
    return 0;
  }
};

const normalizeFrequency = (s) => {
  try {
    const f = String(s ?? "weekly").toLowerCase().replace(/\s|-/g, "");
    if (["weekly","week","perweek","pw","p/w","wk"].includes(f)) return "weekly";
    if (["fortnightly","fortnight","perfortnight","fn","pfn","biweekly"].includes(f)) return "fortnightly";
    if (["monthly","month","permonth","pcm","pm"].includes(f)) return "monthly";
    if (["daily","day","perday","pd"].includes(f)) return "daily";
    if (["annual","yearly","peryear","pa","py"].includes(f)) return "annual";
    return "weekly";
  } catch (error) {
    console.warn('normalizeFrequency error:', error);
    return "weekly";
  }
};

// Enhanced daily conversion using FinancialCalculations utility
const dailyFromFrequency = (amount, freq) => {
  try {
    return calculateDailyAmount(amount, normalizeFrequency(freq));
  } catch (error) {
    console.warn('dailyFromFrequency error:', error);
    return 0;
  }
};

const INCOME_TYPES = new Set(["income","rent","rental","other_income"]);
const EXPENSE_TYPES = new Set(["expense","maintenance","repair","fees","insurance","tax","management_fee","interest"]);
const IGNORE_IN_PNL = new Set(["principal"]);

// Normalize a signed working amount based on TYPE first, raw sign second
const normalizedAmt = (row) => {
  try {
    if (!row) return 0;
    const t = String(row?.type || "").toLowerCase();
    const a = Math.abs(toNum(row?.amount));
    if (!a || IGNORE_IN_PNL.has(t)) return 0;
    if (INCOME_TYPES.has(t)) return +a;
    if (EXPENSE_TYPES.has(t)) return -a;
    const raw = toNum(row?.amount);
    if (raw > 0) return +a;
    if (raw < 0) return -a;
    return 0;
  } catch (error) {
    console.warn('normalizedAmt error:', error);
    return 0;
  }
};

const TransactionTable = ({ transactions, propertyId, settings, properties, onSaveData, loans, addNotification }) => {
  // Guard inputs with comprehensive error handling
  const safeTransactions = useMemo(() => {
    try {
      return Array.isArray(transactions) ? transactions.filter(t => t && typeof t === 'object' && t.id) : [];
    } catch (error) {
      console.warn('safeTransactions error:', error);
      return [];
    }
  }, [transactions]);

  const safeProperties = useMemo(() => {
    try {
      return Array.isArray(properties) ? properties.filter(p => p && typeof p === 'object' && p.id) : [];
    } catch (error) {
      console.warn('safeProperties error:', error);
      return [];
    }
  }, [properties]);

  const safeLoans = useMemo(() => {
    try {
      return Array.isArray(loans) ? loans.filter(l => l && typeof l === 'object') : [];
    } catch (error) {
      console.warn('safeLoans error:', error);
      return [];
    }
  }, [loans]);

  const safeSettings = useMemo(() => {
    try {
      return settings && typeof settings === 'object' ? settings : { financialYearStart: '07-01', notifications: [] };
    } catch (error) {
      console.warn('safeSettings error:', error);
      return { financialYearStart: '07-01', notifications: [] };
    }
  }, [settings]);
  
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'daily'
  const [filters, setFilters] = useState({
    type: 'all',
    category: 'all',
    propertyId: propertyId || 'all',
    startDate: '',
    endDate: ''
  });
  const [isExporting, setIsExporting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [formData, setFormData] = useState({
    type: 'income',
    category: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    propertyId: propertyId || '',
    payee: '',
    reminderDate: ''
  });
  const [errors, setErrors] = useState({});

  // Set default date range to current financial year if not set
  useEffect(() => {
    try {
      if (!filters.startDate && !filters.endDate) {
        const currentYear = new Date().getFullYear();
        const fyStart = safeSettings?.financialYearStart || '07-01';
        const [month, day] = fyStart.split('-').map(Number);
        
        // Determine if we're in the current FY or next FY
        const now = new Date();
        const currentFYStart = new Date(currentYear, month - 1, day);
        const isInCurrentFY = now >= currentFYStart;
        
        const startYear = isInCurrentFY ? currentYear : currentYear - 1;
        const startDate = new Date(startYear, month - 1, day).toISOString().split('T')[0];
        const endDate = new Date(startYear + 1, month - 1, day - 1).toISOString().split('T')[0];
        
        setFilters(prev => ({
          ...prev,
          startDate,
          endDate
        }));
      }
    } catch (error) {
      console.warn('Error setting default date range:', error);
    }
  }, [safeSettings]);

  // Update property filter when propertyId prop changes
  useEffect(() => {
    try {
      if (propertyId) {
        setFilters(prev => ({
          ...prev,
          propertyId: propertyId
        }));
      }
    } catch (error) {
      console.warn('Error updating property filter:', error);
    }
  }, [propertyId]);

  // Get categories from ALL transactions AND property expenses with error handling
  const categories = useMemo(() => {
    try {
      const uniqueCategories = new Set();
      
      // Add categories from all transactions
      safeTransactions.forEach(t => {
        try {
          if (t && t.category && typeof t.category === 'string') {
            uniqueCategories.add(t.category);
          }
        } catch (error) {
          console.warn('Error processing transaction category:', error);
        }
      });
      
      // Also add expense categories from properties
      safeProperties.forEach(property => {
        try {
          if (property && Array.isArray(property.expenses)) {
            property.expenses.forEach(expense => {
              try {
                if (expense && expense.category && typeof expense.category === 'string') {
                  uniqueCategories.add(expense.category);
                }
              } catch (error) {
                console.warn('Error processing expense category:', error);
              }
            });
          }
        } catch (error) {
          console.warn('Error processing property expenses:', error);
        }
      });
      
      return Array.from(uniqueCategories).sort();
    } catch (error) {
      console.warn('Error getting categories:', error);
      return [];
    }
  }, [safeTransactions, safeProperties]);

  // Apply filters and sorting for list view with comprehensive error handling
  const filteredTransactions = useMemo(() => {
    try {
      let filtered = [...safeTransactions];
      
      // Apply property filter
      if (filters.propertyId && filters.propertyId !== 'all') {
        filtered = filtered.filter(t => {
          try {
            // Handle both property_id (snake_case) and propertyId (camelCase) field naming conventions
            return t && (t.propertyId === filters.propertyId || t.property_id === filters.propertyId);
          } catch (error) {
            console.warn('Error filtering by property:', error);
            return false;
          }
        });
      }
      
      // Apply type filter
      if (filters.type !== 'all') {
        filtered = filtered.filter(t => {
          try {
            return t && t.type === filters.type;
          } catch (error) {
            console.warn('Error filtering by type:', error);
            return false;
          }
        });
      }
      
      // Apply category filter
      if (filters.category !== 'all') {
        filtered = filtered.filter(t => {
          try {
            return t && t.category === filters.category;
          } catch (error) {
            console.warn('Error filtering by category:', error);
            return false;
          }
        });
      }

      // Apply date range filter
      if (filters.startDate) {
        filtered = filtered.filter(t => {
          try {
            return t && t.date && new Date(t.date) >= new Date(filters.startDate);
          } catch (error) {
            console.warn('Error filtering by start date:', error);
            return false;
          }
        });
      }
      
      if (filters.endDate) {
        filtered = filtered.filter(t => {
          try {
            return t && t.date && new Date(t.date) <= new Date(filters.endDate);
          } catch (error) {
            console.warn('Error filtering by end date:', error);
            return false;
          }
        });
      }
      
      // Apply sorting with error handling
      filtered.sort((a, b) => {
        try {
          if (!a || !b) return 0;
          
          let comparison = 0;
          
          if (sortField === 'date') {
            comparison = new Date(a.date || 0) - new Date(b.date || 0);
          } else if (sortField === 'amount') {
            comparison = (a.amount || 0) - (b.amount || 0);
          } else if (sortField === 'category') {
            comparison = (a.category || '').localeCompare(b.category || '');
          } else if (sortField === 'description') {
            comparison = (a.description || '').localeCompare(b.description || '');
          }
          
          return sortDirection === 'asc' ? comparison : -comparison;
        } catch (error) {
          console.warn('Error sorting transactions:', error);
          return 0;
        }
      });
      
      return filtered;
    } catch (error) {
      console.warn('Error filtering transactions:', error);
      return [];
    }
  }, [safeTransactions, filters, sortField, sortDirection]);

  // Get date range objects for daily view processing with error handling
  const startDateObj = useMemo(() => {
    try {
      return filters.startDate ? new Date(filters.startDate) : new Date('2020-01-01');
    } catch (error) {
      console.warn('Error parsing start date:', error);
      return new Date('2020-01-01');
    }
  }, [filters.startDate]);

  const endDateObj = useMemo(() => {
    try {
      return filters.endDate ? new Date(filters.endDate) : new Date();
    } catch (error) {
      console.warn('Error parsing end date:', error);
      return new Date();
    }
  }, [filters.endDate]);

  // Generate synthetic rental and loan transactions for daily view using enhanced calculations
  const syntheticDailyTransactions = useMemo(() => {
    if (viewMode !== 'daily') return [];

    try {
      let syntheticTransactions = [];
      const props = safeProperties;
      const from = startDateObj;
      const to = endDateObj;
      
      if (from && to && from <= to) {
        // Generate rental transactions for each property
        for (const property of props) {
          try {
            if (!property?.id) continue;

            // Apply property filter if set
            if (filters.propertyId && filters.propertyId !== 'all' && property.id !== filters.propertyId) {
              continue;
            }

            // Generate rental transactions using enhanced FinancialCalculations
            const rentalTransactions = generateRentalTransactions(property, from, to);
            syntheticTransactions.push(...rentalTransactions);
          } catch (error) {
            console.warn('Error generating rental transactions for property:', error);
          }
        }

        // Generate loan payment transactions using enhanced FinancialCalculations
        try {
          const loanTransactions = generateLoanPayments(safeLoans, safeProperties, from, to);
          
          // Filter by property if specified
          const filteredLoanTransactions = filters.propertyId && filters.propertyId !== 'all'
            ? loanTransactions.filter(t => t.propertyId === filters.propertyId || t.property_id === filters.propertyId)
            : loanTransactions;
            
          syntheticTransactions.push(...filteredLoanTransactions);
        } catch (error) {
          console.warn('Error generating loan transactions:', error);
        }
      }

      return syntheticTransactions;
    } catch (error) {
      console.error("Synthetic daily transactions generation failed:", error);
      return [];
    }
  }, [viewMode, safeProperties, safeLoans, startDateObj, endDateObj, filters.propertyId]);

  // Generate daily view data with synthetic rows and error handling
  const dailyViewData = useMemo(() => {
    if (viewMode !== 'daily') return [];
    
    try {
      // Check if date range is too large (more than 400 days)
      const startDate = new Date(filters.startDate || '2020-01-01');
      const endDate = new Date(filters.endDate || new Date().toISOString().split('T')[0]);
      const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > 400) {
        return null; // Signal to show warning message
      }

      // Create merged array of base transactions + synthetic daily rows
      const allTransactionsForPeriod = [];

      // Add actual transactions for the period (already filtered)
      allTransactionsForPeriod.push(...filteredTransactions);

      // Add synthetic daily rows (rentals and loans converted to daily)
      allTransactionsForPeriod.push(...syntheticDailyTransactions);

      // Apply additional filters to the merged array
      let finalFiltered = allTransactionsForPeriod;

      if (filters.type !== 'all') {
        finalFiltered = finalFiltered.filter(t => {
          try {
            return t && t.type === filters.type;
          } catch (error) {
            console.warn('Error filtering merged data by type:', error);
            return false;
          }
        });
      }

      if (filters.category !== 'all') {
        finalFiltered = finalFiltered.filter(t => {
          try {
            return t && t.category === filters.category;
          } catch (error) {
            console.warn('Error filtering merged data by category:', error);
            return false;
          }
        });
      }

      return finalFiltered;
    } catch (error) {
      console.warn('Error generating daily view data:', error);
      return [];
    }
  }, [viewMode, filters, filteredTransactions, syntheticDailyTransactions]);

  // Generate final rendered rows for both views - this is the single source of truth
  const finalRenderedRows = useMemo(() => {
    try {
      if (viewMode === 'daily' && Array.isArray(dailyViewData)) {
        // For daily view, group by date and sum amounts
        const dailyGroups = {};
        
        dailyViewData.forEach(transaction => {
          try {
            if (!transaction) return;
            
            const dateStr = transaction.date;
            if (!dailyGroups[dateStr]) {
              dailyGroups[dateStr] = {
                date: dateStr,
                income: 0,
                expenses: 0,
                net: 0,
                transactions: [] // Store individual transactions for detailed export
              };
            }

            const amount = sanitize(transaction.amount);
            
            // Use normalizedAmt to determine income vs expense based on type
            const normalizedAmount = normalizedAmt(transaction);
            
            if (normalizedAmount > 0) {
              dailyGroups[dateStr].income += normalizedAmount;
            } else if (normalizedAmount < 0) {
              dailyGroups[dateStr].expenses += Math.abs(normalizedAmount);
            }

            // Store transaction details for export
            dailyGroups[dateStr].transactions.push({
              ...transaction,
              normalizedAmount,
              dailyEquivalent: transaction.isAutoGenerated ? amount : null,
              originalAmount: transaction.originalAmount || null,
              originalFrequency: transaction.originalFrequency || null
            });
          } catch (error) {
            console.warn('Error processing transaction in daily view:', error);
          }
        });

        // Calculate net for each day
        Object.values(dailyGroups).forEach(day => {
          try {
            day.net = day.income - day.expenses;
          } catch (error) {
            console.warn('Error calculating daily net:', error);
            day.net = 0;
          }
        });

        return Object.values(dailyGroups).sort((a, b) => {
          try {
            return sortDirection === 'asc' 
              ? new Date(a.date) - new Date(b.date)
              : new Date(b.date) - new Date(a.date);
          } catch (error) {
            console.warn('Error sorting daily groups:', error);
            return 0;
          }
        });
      } else {
        // For list view, return filtered transactions
        return filteredTransactions;
      }
    } catch (error) {
      console.warn('Error generating final rendered rows:', error);
      return [];
    }
  }, [viewMode, dailyViewData, filteredTransactions, sortDirection]);

  // Compute totals from the exact array rendered - ensures totals match visible rows
  const visibleRows = useMemo(() => {
    try {
      if (viewMode === "daily") {
        return finalRenderedRows;
      } else {
        return finalRenderedRows.map(r => {
          try {
            return { ...r, __amt: normalizedAmt(r) };
          } catch (error) {
            console.warn('Error processing row for totals:', error);
            return { ...r, __amt: 0 };
          }
        });
      }
    } catch (error) {
      console.warn('Error generating visible rows:', error);
      return [];
    }
  }, [viewMode, finalRenderedRows]);

  const totals = useMemo(() => {
    try {
      return visibleRows.reduce(
        (acc, r) => {
          try {
            if (viewMode === "daily") {
              // If your daily rows are grouped day buckets with {income, expenses}
              const inc = toNum(r?.income); 
              if (inc > 0) acc.income += inc;
              const exp = toNum(r?.expenses); 
              if (exp > 0) acc.expense += exp;
            } else {
              // List view - use normalized amounts
              const amt = toNum(r?.__amt ?? r?.amount);
              if (amt > 0) acc.income += Math.abs(amt);
              if (amt < 0) acc.expense += Math.abs(amt);
            }
            return acc;
          } catch (error) {
            console.warn('Error processing row in totals:', error);
            return acc;
          }
        },
        { income: 0, expense: 0 }
      );
    } catch (error) {
      console.warn('Error calculating totals:', error);
      return { income: 0, expense: 0 };
    }
  }, [visibleRows, viewMode]);

  const net = totals.income - totals.expense;

  // Get recent categories and payees from settings
  const recentCategories = safeSettings?.recentCategories || [];
  const recentPayees = safeSettings?.recentPayees || [];

  const handleSort = useCallback((field) => {
    try {
      if (sortField === field) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortField(field);
        setSortDirection('asc');
      }
    } catch (error) {
      console.warn('Error handling sort:', error);
    }
  }, [sortField, sortDirection]);

  const handleFilterChange = useCallback((e) => {
    try {
      const { name, value } = e.target;
      setFilters(prev => ({ ...prev, [name]: value }));
    } catch (error) {
      console.warn('Error handling filter change:', error);
    }
  }, []);

  const handleExportFiltered = async () => {
    try {
      setIsExporting(true);
      
      const result = await DataManager.exportTransactions(
        filteredTransactions,
        filters.startDate,
        filters.endDate
      );
      
      if (result.success) {
        if (addNotification) {
          addNotification('Filtered transactions exported successfully!', 'success');
        }
      } else {
        throw new Error(result.error || 'Export failed');
      }
    } catch (error) {
      console.error('Export failed:', error);
      if (addNotification) {
        addNotification('Export failed. Please try again.', 'error');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportDaily = async () => {
    if (!Array.isArray(finalRenderedRows) || finalRenderedRows.length === 0) return;

    try {
      setIsExporting(true);
      
      // Create enhanced CSV content with original amounts and daily conversions
      const headers = ['Date', 'Income', 'Expenses', 'Net', 'Details'];
      const csvContent = [
        headers.join(','),
        ...finalRenderedRows.map(day => {
          // Create detailed breakdown for each day
          const details = day.transactions ? day.transactions.map(t => {
            const detail = `${t.description}`;
            if (t.originalAmount && t.originalFrequency) {
              return `${detail} (${formatCurrency(t.originalAmount)} ${t.originalFrequency} = ${formatCurrency(t.amount)} daily)`;
            }
            return detail;
          }).join('; ') : '';
          
          return [
            day.date,
            formatCurrency(day.income).replace(/[,$]/g, ''),
            formatCurrency(day.expenses).replace(/[,$]/g, ''),
            formatCurrency(day.net).replace(/[,$]/g, ''),
            `"${details}"` // Wrap in quotes to handle commas in descriptions
          ].join(',');
        })
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      const propertyName = filters.propertyId && filters.propertyId !== 'all'
        ? safeProperties.find(p => p && p.id === filters.propertyId)?.address || 'Property'
        : 'All';
      
      link.href = url;
      link.download = `DailyLedger_${propertyName}_${filters.startDate}_${filters.endDate}_${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      if (addNotification) {
        addNotification('Daily ledger with conversion details exported successfully!', 'success');
      }
    } catch (error) {
      console.error('Daily export failed:', error);
      if (addNotification) {
        addNotification('Daily export failed. Please try again.', 'error');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleKeyDown = useCallback((e) => {
    try {
      if (e.key === 'Backspace' && e.target.tagName === 'INPUT') {
        e.stopPropagation();
      }
    } catch (error) {
      console.warn('Error handling key down:', error);
    }
  }, []);

  const handleChipClick = useCallback((field, value) => {
    try {
      setFormData(prev => ({ ...prev, [field]: value }));
    } catch (error) {
      console.warn('Error handling chip click:', error);
    }
  }, []);

  const updateRecentItems = useCallback((category, payee) => {
    try {
      const updatedCategories = [category, ...recentCategories.filter(c => c !== category)].slice(0, 5);
      const updatedPayees = payee ? [payee, ...recentPayees.filter(p => p !== payee)].slice(0, 5) : recentPayees;
      
      const updatedSettings = {
        ...safeSettings,
        recentCategories: updatedCategories,
        recentPayees: updatedPayees
      };

      if (onSaveData) {
        onSaveData({
          properties: safeProperties,
          loans: safeLoans,
          transactions: safeTransactions,
          settings: updatedSettings
        });
      }
    } catch (error) {
      console.warn('Error updating recent items:', error);
    }
  }, [recentCategories, recentPayees, safeSettings, onSaveData, safeProperties, safeLoans, safeTransactions]);

  const handleAddSimilar = useCallback((transaction) => {
    try {
      if (!transaction) return;
      
      setFormData({
        ...transaction,
        id: undefined,
        date: new Date().toISOString().split('T')[0],
        reminderDate: ''
      });
      setEditingTransaction(null);
      setShowAddForm(true);
    } catch (error) {
      console.warn('Error handling add similar:', error);
    }
  }, []);

  const handleSaveTransaction = useCallback(async () => {
    try {
      if (formData.category && formData.payee) {
        updateRecentItems(formData.category, formData.payee);
      }
      
      setShowAddForm(false);
      setEditingTransaction(null);
    } catch (error) {
      console.warn('Error saving transaction:', error);
    }
  }, [formData, updateRecentItems]);

  useEffect(() => {
    try {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    } catch (error) {
      console.warn('Error setting up key down listener:', error);
    }
  }, [handleKeyDown]);

  const SortIcon = ({ field }) => {
    try {
      if (sortField !== field) return null;
      return sortDirection === 'asc' ? (
        <SafeIcon icon={FiChevronUp} className="w-4 h-4 ml-1" />
      ) : (
        <SafeIcon icon={FiChevronDown} className="w-4 h-4 ml-1" />
      );
    } catch (error) {
      console.warn('Error rendering sort icon:', error);
      return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Enhanced Filters with View Toggle */}
      <div className="bg-gray-700/30 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <SafeIcon icon={FiFilter} className="w-4 h-4 mr-2 text-purple-400" />
              <h4 className="text-white font-medium">Filter Transactions</h4>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2 bg-gray-600/50 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center space-x-2 px-3 py-1 rounded text-sm transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <SafeIcon icon={FiList} className="w-4 h-4" />
                <span>List View</span>
              </button>
              <button
                onClick={() => setViewMode('daily')}
                className={`flex items-center space-x-2 px-3 py-1 rounded text-sm transition-colors ${
                  viewMode === 'daily' 
                    ? 'bg-green-600 text-white' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <SafeIcon icon={FiBarChart3} className="w-4 h-4" />
                <span>Daily View</span>
              </button>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {viewMode === 'daily' && Array.isArray(finalRenderedRows) && finalRenderedRows.length > 0 && (
              <button
                onClick={handleExportDaily}
                disabled={isExporting}
                className="btn-secondary flex items-center space-x-2 text-sm"
              >
                <SafeIcon icon={FiDownload} className="w-4 h-4" />
                <span>{isExporting ? 'Exporting...' : 'Export Daily CSV'}</span>
              </button>
            )}
            
            {viewMode === 'list' && filteredTransactions.length > 0 && (
              <button
                onClick={handleExportFiltered}
                disabled={isExporting}
                className="btn-secondary flex items-center space-x-2 text-sm"
              >
                <SafeIcon icon={FiDownload} className="w-4 h-4" />
                <span>{isExporting ? 'Exporting...' : 'Export Filtered'}</span>
              </button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Property Filter - Show only when not on individual property page */}
          {!propertyId && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <SafeIcon icon={FiHome} className="w-3 h-3 inline mr-1" />
                Property
              </label>
              <select
                name="propertyId"
                value={filters.propertyId}
                onChange={handleFilterChange}
                className="form-select"
              >
                <option value="all">All Properties</option>
                {safeProperties.map(property => (
                  property && property.id ? (
                    <option key={property.id} value={property.id}>
                      {property.address || property.name}
                    </option>
                  ) : null
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Transaction Type
            </label>
            <select
              name="type"
              value={filters.type}
              onChange={handleFilterChange}
              className="form-select"
            >
              <option value="all">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Category
            </label>
            <select
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              className="form-select"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <SafeIcon icon={FiCalendar} className="w-3 h-3 inline mr-1" />
              Start Date
            </label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="form-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <SafeIcon icon={FiCalendar} className="w-3 h-3 inline mr-1" />
              End Date
            </label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="form-input"
            />
          </div>
        </div>

        {/* Enhanced Active Filters Display with Conversion Info */}
        <div className="mt-3 flex flex-wrap gap-2">
          {filters.propertyId && filters.propertyId !== 'all' && (
            <div className="inline-flex items-center px-2 py-1 bg-blue-900/20 border border-blue-700 rounded text-xs">
              <SafeIcon icon={FiHome} className="w-3 h-3 mr-1 text-blue-400" />
              <span className="text-blue-400">
                Property: {safeProperties.find(p => p && p.id === filters.propertyId)?.address || 'Unknown'}
              </span>
            </div>
          )}
          
          {filters.type !== 'all' && (
            <div className="inline-flex items-center px-2 py-1 bg-green-900/20 border border-green-700 rounded text-xs">
              <span className="text-green-400">Type: {filters.type}</span>
            </div>
          )}
          
          {filters.category !== 'all' && (
            <div className="inline-flex items-center px-2 py-1 bg-purple-900/20 border border-purple-700 rounded text-xs">
              <SafeIcon icon={FiTag} className="w-3 h-3 mr-1 text-purple-400" />
              <span className="text-purple-400">Category: {filters.category}</span>
            </div>
          )}
          
          {filters.startDate && (
            <div className="inline-flex items-center px-2 py-1 bg-orange-900/20 border border-orange-700 rounded text-xs">
              <SafeIcon icon={FiCalendar} className="w-3 h-3 mr-1 text-orange-400" />
              <span className="text-orange-400">From: {filters.startDate}</span>
            </div>
          )}
          
          {filters.endDate && (
            <div className="inline-flex items-center px-2 py-1 bg-orange-900/20 border border-orange-700 rounded text-xs">
              <SafeIcon icon={FiCalendar} className="w-3 h-3 mr-1 text-orange-400" />
              <span className="text-orange-400">To: {filters.endDate}</span>
            </div>
          )}

          {viewMode === 'daily' && (
            <div className="inline-flex items-center px-2 py-1 bg-yellow-900/20 border border-yellow-700 rounded text-xs">
              <SafeIcon icon={FiBarChart3} className="w-3 h-3 mr-1 text-yellow-400" />
              <span className="text-yellow-400">Auto-converting monthly/weekly amounts to daily</span>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Income</p>
              <p className="text-2xl font-bold text-green-400">{formatCurrency(totals.income)}</p>
              {viewMode === 'daily' && (
                <p className="text-xs text-gray-500 mt-1">Daily equivalent amounts</p>
              )}
            </div>
            <div className="w-12 h-12 rounded-full bg-green-900/30 flex items-center justify-center">
              <SafeIcon icon={FiTrendingUp} className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Expenses</p>
              <p className="text-2xl font-bold text-red-400">{formatCurrency(totals.expense)}</p>
              {viewMode === 'daily' && (
                <p className="text-xs text-gray-500 mt-1">Daily equivalent amounts</p>
              )}
            </div>
            <div className="w-12 h-12 rounded-full bg-red-900/30 flex items-center justify-center">
              <SafeIcon icon={FiTrendingDown} className="w-6 h-6 text-red-400" />
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Net Cash Flow</p>
              <p className={`text-2xl font-bold ${net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(net)}
              </p>
              {viewMode === 'daily' && (
                <p className="text-xs text-gray-500 mt-1">Daily equivalent amounts</p>
              )}
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-900/30 flex items-center justify-center">
              <SafeIcon icon={FiDollarSign} className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Daily View Warning for Large Date Ranges */}
      {viewMode === 'daily' && dailyViewData === null && (
        <div className="card p-6 text-center">
          <div className="w-16 h-16 bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <SafeIcon icon={FiCalendar} className="w-8 h-8 text-yellow-400" />
          </div>
          <h3 className="text-xl font-medium text-yellow-400 mb-2">Date Range Too Large</h3>
          <p className="text-gray-400 mb-4">
            Daily view is limited to 400 days to ensure optimal performance. 
            Please select a smaller date range.
          </p>
          <div className="text-sm text-gray-500">
            Current range: {Math.ceil((new Date(filters.endDate || new Date()) - new Date(filters.startDate || '2020-01-01')) / (1000 * 60 * 60 * 24))} days
          </div>
        </div>
      )}

      {/* Transaction Table/Daily View */}
      {viewMode === 'list' ? (
        // List View
        <div className="card overflow-hidden">
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center">
              <SafeIcon icon={FiList} className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-400 mb-2">No Transactions Found</h3>
              <p className="text-gray-500">Try adjusting your filters or add some transactions</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700/50">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white"
                      onClick={() => handleSort('date')}
                    >
                      <div className="flex items-center">
                        Date
                        <SortIcon field="date" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white"
                      onClick={() => handleSort('description')}
                    >
                      <div className="flex items-center">
                        Description
                        <SortIcon field="description" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white"
                      onClick={() => handleSort('category')}
                    >
                      <div className="flex items-center">
                        Category
                        <SortIcon field="category" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white"
                      onClick={() => handleSort('amount')}
                    >
                      <div className="flex items-center justify-end">
                        Amount
                        <SortIcon field="amount" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {visibleRows.map((transaction, index) => {
                    try {
                      // When rendering each List View row's amount, use the normalized value so the sign/color matches totals.
                      const amt = toNum(transaction.__amt ?? transaction.amount);
                      const isPositive = amt >= 0;
                      
                      return (
                        <tr key={transaction.id || index} className="hover:bg-gray-700/30">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {new Date(transaction.date).toLocaleDateString()}
                            {transaction.reminderDate && (
                              <div className="text-xs text-yellow-400 flex items-center mt-1">
                                <SafeIcon icon={FiBell} className="w-3 h-3 mr-1" />
                                {new Date(transaction.reminderDate).toLocaleDateString()}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-white">
                            <div className="font-medium">{transaction.description}</div>
                            {transaction.payee && (
                              <div className="text-xs text-gray-400">{transaction.payee}</div>
                            )}
                            {transaction.isAutoGenerated && transaction.originalAmount && transaction.originalFrequency && (
                              <div className="text-xs text-blue-400 mt-1">
                                Auto-converted from {formatCurrency(transaction.originalAmount)} {transaction.originalFrequency}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              transaction.type === 'income' 
                                ? 'bg-green-900/30 text-green-400' 
                                : 'bg-red-900/30 text-red-400'
                            }`}>
                              {transaction.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <span className={`font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                              {isPositive ? '+' : '-'}{formatCurrency(Math.abs(amt))}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                            <button
                              onClick={() => handleAddSimilar(transaction)}
                              className="text-gray-400 hover:text-blue-400 transition-colors"
                              title="Add Similar"
                            >
                              <SafeIcon icon={FiCopy} className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    } catch (error) {
                      console.warn('Error rendering transaction row:', error);
                      return null;
                    }
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        // Daily View
        dailyViewData !== null && (
          <div className="card overflow-hidden">
            {finalRenderedRows.length === 0 ? (
              <div className="p-8 text-center">
                <SafeIcon icon={FiBarChart3} className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-400 mb-2">No Daily Data Found</h3>
                <p className="text-gray-500">Try adjusting your filters or date range</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Income (Daily)
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Expenses (Daily)
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Net (Daily)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {finalRenderedRows.map((day, index) => {
                      try {
                        return (
                          <tr key={day.date || index} className="hover:bg-gray-700/30">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {new Date(day.date).toLocaleDateString('en-US', { 
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-green-400">
                              {formatCurrency(day.income)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-red-400">
                              {formatCurrency(day.expenses)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold">
                              <span className={day.net >= 0 ? 'text-green-400' : 'text-red-400'}>
                                {formatCurrency(day.net)}
                              </span>
                            </td>
                          </tr>
                        );
                      } catch (error) {
                        console.warn('Error rendering daily row:', error);
                        return null;
                      }
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      )}

      {/* Footer Summary */}
      <div className="bg-gray-700/30 p-4 rounded-lg">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-6">
            <span className="text-gray-400">
              Showing {viewMode === 'daily' ? finalRenderedRows.length : filteredTransactions.length} {viewMode === 'daily' ? 'days' : 'transactions'}
            </span>
            {viewMode === 'list' && (
              <span className="text-gray-400">
                Date range: {filters.startDate || 'All'} to {filters.endDate || 'All'}
              </span>
            )}
            {viewMode === 'daily' && (
              <span className="text-blue-400">
                Monthly/weekly amounts auto-converted to daily equivalents
              </span>
            )}
          </div>
          <div className="flex items-center space-x-6">
            <span className="text-green-400 font-medium">
              Income: {formatCurrency(totals.income)}
            </span>
            <span className="text-red-400 font-medium">
              Expenses: {formatCurrency(totals.expense)}
            </span>
            <span className={`font-bold ${net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              Net: {formatCurrency(net)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionTable;
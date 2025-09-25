import SupabaseManager from '../services/SupabaseManager';

// Load all user data
export const loadUserData = async (setData) => {
  try {
    // Get all user data in parallel
    const [
      propertiesResult,
      loansResult,
      transactionsResult,
      expensesResult,
      rentalsResult,
      agentsResult
    ] = await Promise.all([
      SupabaseManager.getProperties(),
      SupabaseManager.getLoans(),
      SupabaseManager.getTransactions(),
      SupabaseManager.getExpenses(),
      SupabaseManager.getRentals(),
      SupabaseManager.getAgents()
    ]);

    // DEBUG: Log the raw responses
    console.log('DataUtils - Properties result:', propertiesResult);
    console.log('DataUtils - Properties data:', propertiesResult?.properties);

    // Update state with extracted data
    setData(prevData => ({
      ...prevData,
      properties: propertiesResult?.properties || [],
      loans: loansResult?.loans || [],
      transactions: transactionsResult?.transactions || [],
      expenses: expensesResult?.expenses || [],
      rentals: rentalsResult?.rentals || [],
      agents: agentsResult?.agents || []
    }));
    
    // Handle settings separately if needed
    const settingsResult = await SupabaseManager.getSettings();
    setData(prevData => ({
      ...prevData,
      settings: settingsResult?.settings || {
        financialYearStart: '07-01',
        notifications: []
      }
    }));
  } catch (error) {
    console.error('Error loading user data:', error);
    setData({
      properties: [],
      loans: [],
      transactions: [],
      expenses: [],
      rentals: [],
      agents: [],
      settings: {
        financialYearStart: '07-01',
        notifications: []
      }
    });
  }
};

// Refresh data from Supabase
export const handleSaveData = async (newData, setData) => {
  try {
    // Update local state if newData is provided
    if (newData) {
      setData(newData);
    }

    // Refresh data from Supabase to ensure consistency
    await loadUserData(setData);

    return { success: true };
  } catch (error) {
    console.error('Failed to refresh data:', error);
    throw error;
  }
};

// Enhanced save data function that adds notifications for major actions
export const handleSaveDataWithNotification = async (newData, setData, addNotificationCallback, actionDescription) => {
  try {
    await handleSaveData(newData, setData);
    if (actionDescription) {
      addNotificationCallback(actionDescription, 'success');
    }
  } catch (error) {
    if (actionDescription) {
      addNotificationCallback(`Failed: ${actionDescription}`, 'error');
    }
    throw error;
  }
};

// Property-specific operations
export const createProperty = async (propertyData) => {
  try {
    const result = await SupabaseManager.createProperty(propertyData);
    if (!result.success) {
      throw new Error(result.error || 'Failed to create property');
    }
    return { success: true, property: result.property };
  } catch (error) {
    console.error('Failed to create property:', error);
    return { success: false, error: error.message };
  }
};

export const updateProperty = async (id, propertyData) => {
  try {
    const result = await SupabaseManager.updateProperty(id, propertyData);
    if (!result.success) {
      throw new Error(result.error || 'Failed to update property');
    }
    return result.property;
  } catch (error) {
    console.error('Failed to update property:', error);
    throw error;
  }
};

export const deleteProperty = async (id) => {
  try {
    const result = await SupabaseManager.deleteProperty(id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete property');
    }
    return { success: true };
  } catch (error) {
    console.error('Failed to delete property:', error);
    return { success: false, error: error.message };
  }
};

// Transaction-specific operations
export const createTransaction = async (transactionData) => {
  try {
    const result = await SupabaseManager.createTransaction(transactionData);
    if (!result.success) {
      throw new Error(result.error || 'Failed to create transaction');
    }
    return { success: true, transaction: result.transaction };
  } catch (error) {
    console.error('Failed to create transaction:', error);
    return { success: false, error: error.message };
  }
};

export const updateTransaction = async (id, transactionData) => {
  try {
    const result = await SupabaseManager.updateTransaction(id, transactionData);
    if (!result.success) {
      throw new Error(result.error || 'Failed to update transaction');
    }
    return result.transaction;
  } catch (error) {
    console.error('Failed to update transaction:', error);
    throw error;
  }
};

export const deleteTransaction = async (id) => {
  try {
    const result = await SupabaseManager.deleteTransaction(id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete transaction');
    }
    return { success: true };
  } catch (error) {
    console.error('Failed to delete transaction:', error);
    return { success: false, error: error.message };
  }
};

// Loan-specific operations
export const createLoan = async (loanData) => {
  try {
    const result = await SupabaseManager.createLoan(loanData);
    if (!result.success) {
      throw new Error(result.error || 'Failed to create loan');
    }
    return { success: true, loan: result.loan };
  } catch (error) {
    console.error('Failed to create loan:', error);
    return { success: false, error: error.message };
  }
};

export const updateLoan = async (id, loanData) => {
  try {
    const result = await SupabaseManager.updateLoan(id, loanData);
    if (!result.success) {
      return { success: false, error: result.error || 'Failed to update loan' };
    }
    return { success: true, loan: result.loan };
  } catch (error) {
    console.error('Failed to update loan:', error);
    return { success: false, error: error.message };
  }
};

export const deleteLoan = async (id) => {
  try {
    const result = await SupabaseManager.deleteLoan(id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete loan');
    }
    return { success: true };
  } catch (error) {
    console.error('Failed to delete loan:', error);
    return { success: false, error: error.message };
  }
};

// Expense-specific operations
export const createExpense = async (expenseData) => {
  try {
    const result = await SupabaseManager.createExpense(expenseData);
    return result;
  } catch (error) {
    console.error('Failed to create expense:', error);
    return { success: false, error: error.message };
  }
};

export const updateExpense = async (id, expenseData) => {
  try {
    const result = await SupabaseManager.updateExpense(id, expenseData);
    return result;
  } catch (error) {
    console.error('Failed to update expense:', error);
    return { success: false, error: error.message };
  }
};

export const deleteExpense = async (id) => {
  try {
    const result = await SupabaseManager.deleteExpense(id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete expense');
    }
    return { success: true };
  } catch (error) {
    console.error('Failed to delete expense:', error);
    return { success: false, error: error.message };
  }
};

// Rental-specific operations
export const createRental = async (rentalData) => {
  try {
    const result = await SupabaseManager.createRental(rentalData);
    if (!result.success) {
      throw new Error(result.error || 'Failed to create rental');
    }
    return { success: true, rental: result.rental };
  } catch (error) {
    console.error('Failed to create rental:', error);
    return { success: false, error: error.message };
  }
};

export const updateRental = async (id, rentalData) => {
  try {
    const result = await SupabaseManager.updateRental(id, rentalData);
    if (!result.success) {
      throw new Error(result.error || 'Failed to update rental');
    }
    return { success: true, rental: result.rental };
  } catch (error) {
    console.error('Failed to update rental:', error);
    return { success: false, error: error.message };
  }
};

export const deleteRental = async (id) => {
  try {
    const result = await SupabaseManager.deleteRental(id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete rental');
    }
    return { success: true };
  } catch (error) {
    console.error('Failed to delete rental:', error);
    return { success: false, error: error.message };
  }
};

// Agent-specific operations
export const createAgent = async (agentData) => {
  try {
    const result = await SupabaseManager.createAgent(agentData);
    if (!result.success) {
      throw new Error(result.error || 'Failed to create agent');
    }
    return { success: true, agent: result.agent };
  } catch (error) {
    console.error('Failed to create agent:', error);
    return { success: false, error: error.message };
  }
};

export const updateAgent = async (id, agentData) => {
  try {
    const result = await SupabaseManager.updateAgent(id, agentData);
    if (!result.success) {
      return { success: false, error: result.error || 'Failed to update agent' };
    }
    return { success: true, agent: result.agent };
  } catch (error) {
    console.error('Failed to update agent:', error);
    return { success: false, error: error.message };
  }
};

export const deleteAgent = async (id) => {
  try {
    const result = await SupabaseManager.deleteAgent(id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete agent');
    }
    return { success: true };
  } catch (error) {
    console.error('Failed to delete agent:', error);
    return { success: false, error: error.message };
  }
};
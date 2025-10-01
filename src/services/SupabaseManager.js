import { createClient } from '@supabase/supabase-js';

class SupabaseManager {
  static supabase = null;
  static currentUser = null;

  // Initialize Supabase client
  static async init() {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        console.warn('Supabase credentials not found in environment variables. Using demo mode.');
        // For demo purposes, we'll create a mock client
        this.supabase = null;
        this.isInitialized = true;
        return;
      }

      this.supabase = createClient(supabaseUrl, supabaseKey);
      this.isInitialized = true;
      
      // Check if user is already authenticated
      const { data: { user } } = await this.supabase.auth.getUser();
      if (user) {
        this.currentUser = user;
      }
      
      console.log('Supabase initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Supabase:', error);
      this.supabase = null;
      this.isInitialized = true; // Still mark as initialized to prevent infinite loops
    }
  }

  // Authentication Methods
  static async register(email, password, passwordConfirm, name = '') {
    try {
      if (password !== passwordConfirm) {
        return { success: false, error: 'Passwords do not match' };
      }

      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || email.split('@')[0]
          }
        }
      });

      if (error) throw error;

      return { success: true, user: data.user };
    } catch (error) {
      console.error('Registration failed:', error);
      return { success: false, error: error.message };
    }
  }

  static async login(email, password) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      this.currentUser = data.user;
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Login failed:', error);
      
      // Provide more specific error messages
      if (error.message.includes('Invalid login credentials')) {
        return { success: false, error: 'Invalid email or password. Please check your credentials.' };
      } else if (error.message.includes('Email not confirmed')) {
        return { success: false, error: 'Please check your email and confirm your account before logging in.' };
      }
      
      return { success: false, error: error.message || 'Login failed. Please try again.' };
    }
  }

  static async logout() {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) throw error;
      
      this.currentUser = null;
      return { success: true };
    } catch (error) {
      console.error('Logout failed:', error);
      return { success: false, error: error.message };
    }
  }

  static isAuthenticated() {
    return this.currentUser !== null;
  }

  static getCurrentUser() {
    return this.currentUser;
  }

  // User Profile Management
  static async createUserProfile(userId) {
    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .insert([{
          user_id: userId,
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, profile: data };
    } catch (error) {
      console.error('Failed to create user profile:', error);
      return { success: false, error: error.message };
    }
  }

  static async getUserProfile(userId = null) {
    try {
      const targetUserId = userId || this.currentUser?.id;
      if (!targetUserId) {
        return { success: false, error: 'No user ID provided' };
      }

      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', targetUserId)
        .single();

      if (error) {
        // If profile doesn't exist, create it
        if (error.code === 'PGRST116') {
          return await this.createUserProfile(targetUserId);
        }
        throw error;
      }

      return { success: true, profile: data };
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return { success: false, error: error.message };
    }
  }

  static async updateUserProfile(userId, profileData) {
    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .update(profileData)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, profile: data };
    } catch (error) {
      console.error('Failed to update user profile:', error);
      return { success: false, error: error.message };
    }
  }

  static async setUserActiveStatus(userId, isActive) {
    try {
      return await this.updateUserProfile(userId, { is_active: isActive });
    } catch (error) {
      console.error('Failed to set user active status:', error);
      return { success: false, error: error.message };
    }
  }

  // Property Management
  static async createProperty(propertyData) {
    try {
      // Transform camelCase to snake_case for database
      const data = {
        name: propertyData.name,
        address: propertyData.address,
        purchase_price: propertyData.purchasePrice || propertyData.basePropertyCost,
        base_property_cost: propertyData.basePropertyCost,
        current_value: propertyData.currentValue,
        purchase_date: propertyData.purchaseDate,
        property_type: propertyData.propertyType,
        bedrooms: propertyData.bedrooms,
        bathrooms: propertyData.bathrooms,
        area: propertyData.area,
        notes: propertyData.notes,
        acquisition_costs: propertyData.acquisitionCosts || [],
        user_id: this.currentUser.id
      };
      
      const { data: record, error } = await this.supabase
        .from('properties')
        .insert([data])
        .select()
        .single();

      if (error) throw error;

      return { success: true, property: record };
    } catch (error) {
      console.error('Failed to create property:', error);
      return { success: false, error: error.message };
    }
  }

  static async getProperties() {
    try {
      const { data: records, error } = await this.supabase
        .from('properties')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, properties: records || [] };
    } catch (error) {
      console.error('Failed to fetch properties:', error);
      return { success: false, error: error.message, properties: [] };
    }
  }

  static async updateProperty(id, propertyData) {
    try {
      // Transform camelCase to snake_case for database
      const data = {
        name: propertyData.name,
        address: propertyData.address,
        purchase_price: propertyData.purchasePrice || propertyData.basePropertyCost,
        base_property_cost: propertyData.basePropertyCost,
        current_value: propertyData.currentValue,
        purchase_date: propertyData.purchaseDate,
        property_type: propertyData.propertyType,
        bedrooms: propertyData.bedrooms,
        bathrooms: propertyData.bathrooms,
        area: propertyData.area,
        notes: propertyData.notes,
        acquisition_costs: propertyData.acquisitionCosts || []
      };
      
      const { data: record, error } = await this.supabase
        .from('properties')
        .update(data)
        .eq('id', id)
        .eq('user_id', this.currentUser.id)
        .select()
        .single();

      if (error) throw error;

      return { success: true, property: record };
    } catch (error) {
      console.error('Failed to update property:', error);
      return { success: false, error: error.message };
    }
  }

  static async deleteProperty(id) {
    try {
      const { error } = await this.supabase
        .from('properties')
        .delete()
        .eq('id', id)
        .eq('user_id', this.currentUser.id);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Failed to delete property:', error);
      return { success: false, error: error.message };
    }
  }

  // Loan Management
  static async createLoan(loanData) {
    try {
      const data = {
        ...loanData,
        user_id: this.currentUser.id
      };
      
      const { data: record, error } = await this.supabase
        .from('loans')
        .insert([data])
        .select()
        .single();

      if (error) throw error;

      return { success: true, loan: record };
    } catch (error) {
      console.error('Failed to create loan:', error);
      return { success: false, error: error.message };
    }
  }

  static async getLoans() {
    try {
      const { data: records, error } = await this.supabase
        .from('loans')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, loans: records || [] };
    } catch (error) {
      console.error('Failed to fetch loans:', error);
      return { success: false, error: error.message, loans: [] };
    }
  }

  static async updateLoan(id, loanData) {
    try {
      const { data: record, error } = await this.supabase
        .from('loans')
        .update(loanData)
        .eq('id', id)
        .eq('user_id', this.currentUser.id)
        .select()
        .single();

      if (error) throw error;

      return { success: true, loan: record };
    } catch (error) {
      console.error('Failed to update loan:', error);
      return { success: false, error: error.message };
    }
  }

  static async deleteLoan(id) {
    try {
      const { error } = await this.supabase
        .from('loans')
        .delete()
        .eq('id', id)
        .eq('user_id', this.currentUser.id);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Failed to delete loan:', error);
      return { success: false, error: error.message };
    }
  }

  // Transaction Management
  static async createTransaction(transactionData) {
    try {
      const data = {
        ...transactionData,
        user_id: this.currentUser.id
      };
      
      const { data: record, error } = await this.supabase
        .from('transactions')
        .insert([data])
        .select()
        .single();

      if (error) throw error;

      return { success: true, transaction: record };
    } catch (error) {
      console.error('Failed to create transaction:', error);
      return { success: false, error: error.message };
    }
  }

  static async getTransactions() {
    try {
      const { data: records, error } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, transactions: records || [] };
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      return { success: false, error: error.message, transactions: [] };
    }
  }

  static async updateTransaction(id, transactionData) {
    try {
      const { data: record, error } = await this.supabase
        .from('transactions')
        .update(transactionData)
        .eq('id', id)
        .eq('user_id', this.currentUser.id)
        .select()
        .single();

      if (error) throw error;

      return { success: true, transaction: record };
    } catch (error) {
      console.error('Failed to update transaction:', error);
      return { success: false, error: error.message };
    }
  }

  static async deleteTransaction(id) {
    try {
      const { error } = await this.supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', this.currentUser.id);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      return { success: false, error: error.message };
    }
  }

  // Expense Management
  static async createExpense(expenseData) {
    try {
      const data = {
        ...expenseData,
        user_id: this.currentUser.id
      };
      
      const { data: record, error } = await this.supabase
        .from('expenses')
        .insert([data])
        .select()
        .single();

      if (error) throw error;

      return { success: true, expense: record };
    } catch (error) {
      console.error('Failed to create expense:', error);
      return { success: false, error: error.message };
    }
  }

  static async getExpenses(propertyId = null) {
    try {
      let query = this.supabase
        .from('expenses')
        .select('*')
        .eq('user_id', this.currentUser.id);

      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }

      const { data: records, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, expenses: records || [] };
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
      return { success: false, error: error.message, expenses: [] };
    }
  }

  static async updateExpense(id, expenseData) {
    try {
      const { data: record, error } = await this.supabase
        .from('expenses')
        .update(expenseData)
        .eq('id', id)
        .eq('user_id', this.currentUser.id)
        .select()
        .single();

      if (error) throw error;

      return { success: true, expense: record };
    } catch (error) {
      console.error('Failed to update expense:', error);
      return { success: false, error: error.message };
    }
  }

  static async deleteExpense(id) {
    try {
      const { error } = await this.supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', this.currentUser.id);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Failed to delete expense:', error);
      return { success: false, error: error.message };
    }
  }

  // Rental Management
  static async createRental(rentalData) {
    try {
      const data = {
        ...rentalData,
        user_id: this.currentUser.id
      };
      
      const { data: record, error } = await this.supabase
        .from('rentals')
        .insert([data])
        .select()
        .single();

      if (error) throw error;

      return { success: true, rental: record };
    } catch (error) {
      console.error('Failed to create rental:', error);
      return { success: false, error: error.message };
    }
  }

  static async getRentals() {
    try {
      const { data: records, error } = await this.supabase
        .from('rentals')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, rentals: records || [] };
    } catch (error) {
      console.error('Failed to fetch rentals:', error);
      return { success: false, error: error.message, rentals: [] };
    }
  }

  static async updateRental(id, rentalData) {
    try {
      const { data: record, error } = await this.supabase
        .from('rentals')
        .update(rentalData)
        .eq('id', id)
        .eq('user_id', this.currentUser.id)
        .select()
        .single();

      if (error) throw error;

      return { success: true, rental: record };
    } catch (error) {
      console.error('Failed to update rental:', error);
      return { success: false, error: error.message };
    }
  }

  static async deleteRental(id) {
    try {
      const { error } = await this.supabase
        .from('rentals')
        .delete()
        .eq('id', id)
        .eq('user_id', this.currentUser.id);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Failed to delete rental:', error);
      return { success: false, error: error.message };
    }
  }

  // Agent Management
  static async createAgent(agentData) {
    try {
      const data = {
        ...agentData,
        user_id: this.currentUser.id
      };
      
      const { data: record, error } = await this.supabase
        .from('agents')
        .insert([data])
        .select()
        .single();

      if (error) throw error;

      return { success: true, agent: record };
    } catch (error) {
      console.error('Failed to create agent:', error);
      return { success: false, error: error.message };
    }
  }

  static async getAgents() {
    try {
      const { data: records, error } = await this.supabase
        .from('agents')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, agents: records || [] };
    } catch (error) {
      console.error('Failed to fetch agents:', error);
      return { success: false, error: error.message, agents: [] };
    }
  }

  static async updateAgent(id, agentData) {
    try {
      const { data: record, error } = await this.supabase
        .from('agents')
        .update(agentData)
        .eq('id', id)
        .eq('user_id', this.currentUser.id)
        .select()
        .single();

      if (error) throw error;

      return { success: true, agent: record };
    } catch (error) {
      console.error('Failed to update agent:', error);
      return { success: false, error: error.message };
    }
  }

  static async deleteAgent(id) {
    try {
      const { error } = await this.supabase
        .from('agents')
        .delete()
        .eq('id', id)
        .eq('user_id', this.currentUser.id);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Failed to delete agent:', error);
      return { success: false, error: error.message };
    }
  }

  // Settings Management
  static async saveSettings(settings) {
    try {
      const data = {
        user_id: this.currentUser.id,
        settings: settings
      };
      
      // Try to update existing settings or create new ones
      const { data: existingSettings, error: fetchError } = await this.supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .single();

      let record;
      if (existingSettings && !fetchError) {
        const { data: updatedRecord, error } = await this.supabase
          .from('user_settings')
          .update(data)
          .eq('user_id', this.currentUser.id)
          .select()
          .single();
        
        if (error) throw error;
        record = updatedRecord;
      } else {
        const { data: newRecord, error } = await this.supabase
          .from('user_settings')
          .insert([data])
          .select()
          .single();
        
        if (error) throw error;
        record = newRecord;
      }
      
      return { success: true, settings: record };
    } catch (error) {
      console.error('Failed to save settings:', error);
      return { success: false, error: error.message };
    }
  }

  static async getSettings() {
    try {
      const { data: record, error } = await this.supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
      
      const settings = record?.settings || { 
        financialYearStart: '07-01',
        notifications: []
      };
      
      return { success: true, settings };
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      return { 
        success: false, 
        error: error.message, 
        settings: { 
          financialYearStart: '07-01',
          notifications: []
        }
      };
    }
  }

  // Load all data
  static async loadAllData() {
    try {
      const [propertiesResult, loansResult, transactionsResult, expensesResult, rentalsResult, agentsResult, settingsResult] = await Promise.all([
        this.getProperties(),
        this.getLoans(),
        this.getTransactions(),
        this.getExpenses(),
        this.getRentals(),
        this.getAgents(),
        this.getSettings()
      ]);

      return {
        properties: propertiesResult.properties || [],
        loans: loansResult.loans || [],
        transactions: transactionsResult.transactions || [],
        expenses: expensesResult.expenses || [],
        rentals: rentalsResult.rentals || [],
        agents: agentsResult.agents || [],
        settings: settingsResult.settings || {
          financialYearStart: '07-01',
          notifications: []
        }
      };
    } catch (error) {
      console.error('Failed to load all data:', error);
      return {
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
      };
    }
  }

  // Real-time subscriptions
  static subscribeToProperties(callback) {
    return this.supabase
      .channel('properties')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'properties',
          filter: `user_id=eq.${this.currentUser.id}`
        }, 
        callback
      )
      .subscribe();
  }

  static subscribeToTransactions(callback) {
    return this.supabase
      .channel('transactions')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'transactions',
          filter: `user_id=eq.${this.currentUser.id}`
        }, 
        callback
      )
      .subscribe();
  }

  static subscribeToLoans(callback) {
    return this.supabase
      .channel('loans')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'loans',
          filter: `user_id=eq.${this.currentUser.id}`
        }, 
        callback
      )
      .subscribe();
  }

  static subscribeToExpenses(callback) {
    return this.supabase
      .channel('expenses')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'expenses',
          filter: `user_id=eq.${this.currentUser.id}`
        }, 
        callback
      )
      .subscribe();
  }

  static subscribeToRentals(callback) {
    return this.supabase
      .channel('rentals')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'rentals',
          filter: `user_id=eq.${this.currentUser.id}`
        }, 
        callback
      )
      .subscribe();
  }

  static subscribeToAgents(callback) {
    return this.supabase
      .channel('agents')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'agents',
          filter: `user_id=eq.${this.currentUser.id}`
        }, 
        callback
      )
      .subscribe();
  }

  static unsubscribe(subscription) {
    if (subscription) {
      this.supabase.removeChannel(subscription);
    }
  }
}

export default SupabaseManager;
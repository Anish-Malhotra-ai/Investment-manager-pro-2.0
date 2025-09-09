import PocketBase from 'pocketbase';

class PocketbaseManager {
  static pb = new PocketBase('https://every-final.pockethost.io/');
  static currentUser = null;

  // Initialize Pocketbase connection
  static async init() {
    try {
      // Auto-refresh authentication
      this.pb.authStore.onChange((token, model) => {
        this.currentUser = model;
      });

      // Check if user is already authenticated
      if (this.pb.authStore.isValid) {
        this.currentUser = this.pb.authStore.model;
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize Pocketbase:', error);
      return false;
    }
  }

  // Authentication Methods
  static async register(email, password, passwordConfirm, name = '') {
    try {
      const userData = {
        email,
        password,
        passwordConfirm,
        name: name || email.split('@')[0]
      };

      const record = await this.pb.collection('users').create(userData);
      
      // Send verification email
      await this.pb.collection('users').requestVerification(email);
      
      return { success: true, user: record };
    } catch (error) {
      console.error('Registration failed:', error);
      return { success: false, error: error.message };
    }
  }

  static async login(email, password) {
    try {
      // Check if server is reachable first
      await this.pb.health.check();
      
      const authData = await this.pb.collection('users').authWithPassword(email, password);
      this.currentUser = authData.record;
      return { success: true, user: authData.record };
    } catch (error) {
      console.error('Login failed:', error);
      
      // Provide more specific error messages
      if (error.status === 400) {
        return { success: false, error: 'Invalid email or password. Please check your credentials.' };
      } else if (error.status === 0 || error.message.includes('fetch')) {
        return { success: false, error: 'Cannot connect to server. Please make sure Pocketbase is running.' };
      }
      
      return { success: false, error: error.message || 'Login failed. Please try again.' };
    }
  }

  static async logout() {
    try {
      this.pb.authStore.clear();
      this.currentUser = null;
      return { success: true };
    } catch (error) {
      console.error('Logout failed:', error);
      return { success: false, error: error.message };
    }
  }

  static isAuthenticated() {
    return this.pb.authStore.isValid && this.currentUser;
  }

  static getCurrentUser() {
    return this.currentUser;
  }

  // Data Management Methods
  static async createProperty(propertyData) {
    try {
      const data = {
        ...propertyData,
        user: this.currentUser.id,
        created: new Date().toISOString()
      };
      
      const record = await this.pb.collection('properties').create(data);
      return { success: true, property: record };
    } catch (error) {
      console.error('Failed to create property:', error);
      return { success: false, error: error.message };
    }
  }

  static async getProperties() {
    try {
      const records = await this.pb.collection('properties').getFullList({
        filter: `user = "${this.currentUser.id}"`,
        sort: '-created'
      });
      return { success: true, properties: records };
    } catch (error) {
      console.error('Failed to fetch properties:', error);
      return { success: false, error: error.message, properties: [] };
    }
  }

  static async updateProperty(id, propertyData) {
    try {
      const record = await this.pb.collection('properties').update(id, propertyData);
      return { success: true, property: record };
    } catch (error) {
      console.error('Failed to update property:', error);
      return { success: false, error: error.message };
    }
  }

  static async deleteProperty(id) {
    try {
      await this.pb.collection('properties').delete(id);
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
        user: this.currentUser.id,
        created: new Date().toISOString()
      };
      
      const record = await this.pb.collection('loans').create(data);
      return { success: true, loan: record };
    } catch (error) {
      console.error('Failed to create loan:', error);
      return { success: false, error: error.message };
    }
  }

  static async getLoans() {
    try {
      const records = await this.pb.collection('loans').getFullList({
        filter: `user = "${this.currentUser.id}"`,
        sort: '-created'
      });
      return { success: true, loans: records };
    } catch (error) {
      console.error('Failed to fetch loans:', error);
      return { success: false, error: error.message, loans: [] };
    }
  }

  // Transaction Management
  static async createTransaction(transactionData) {
    try {
      const data = {
        ...transactionData,
        user: this.currentUser.id,
        created: new Date().toISOString()
      };
      
      const record = await this.pb.collection('transactions').create(data);
      return { success: true, transaction: record };
    } catch (error) {
      console.error('Failed to create transaction:', error);
      return { success: false, error: error.message };
    }
  }

  static async getTransactions() {
    try {
      const records = await this.pb.collection('transactions').getFullList({
        filter: `user = "${this.currentUser.id}"`,
        sort: '-created'
      });
      return { success: true, transactions: records };
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      return { success: false, error: error.message, transactions: [] };
    }
  }

  // Settings Management
  static async saveSettings(settings) {
    try {
      const data = {
        user: this.currentUser.id,
        settings: JSON.stringify(settings),
        updated: new Date().toISOString()
      };
      
      // Try to update existing settings or create new ones
      const existingSettings = await this.pb.collection('user_settings').getFirstListItem(
        `user = "${this.currentUser.id}"`
      ).catch(() => null);
      
      let record;
      if (existingSettings) {
        record = await this.pb.collection('user_settings').update(existingSettings.id, data);
      } else {
        record = await this.pb.collection('user_settings').create(data);
      }
      
      return { success: true, settings: record };
    } catch (error) {
      console.error('Failed to save settings:', error);
      return { success: false, error: error.message };
    }
  }

  static async getSettings() {
    try {
      const record = await this.pb.collection('user_settings').getFirstListItem(
        `user = "${this.currentUser.id}"`
      );
      
      const settings = JSON.parse(record.settings || '{}');
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

  // Real-time subscriptions
  static subscribeToProperties(callback) {
    return this.pb.collection('properties').subscribe('*', callback);
  }

  static subscribeToTransactions(callback) {
    return this.pb.collection('transactions').subscribe('*', callback);
  }

  static unsubscribe(subscription) {
    if (subscription) {
      this.pb.collection('properties').unsubscribe(subscription);
    }
  }
}

export default PocketbaseManager;
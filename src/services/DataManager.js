import { openDB } from 'idb';
import { sanitize } from '../utils/number';

class DataManager {
  static dbName = 'InvestmentPropertyManagerDB';
  static dbVersion = 1;
  static db = null;
  static backupMethod = 'download';
  static silentBackup = false;

  static async initDB() {
    try {
      if (this.db) return this.db;

      this.db = await openDB(this.dbName, this.dbVersion, {
        upgrade(db) {
          // Properties store
          if (!db.objectStoreNames.contains('properties')) {
            db.createObjectStore('properties', { keyPath: 'id' });
          }

          // Loans store
          if (!db.objectStoreNames.contains('loans')) {
            db.createObjectStore('loans', { keyPath: 'id' });
          }

          // Transactions store
          if (!db.objectStoreNames.contains('transactions')) {
            db.createObjectStore('transactions', { keyPath: 'id' });
          }

          // Settings store
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' });
          }

          // Backups store
          if (!db.objectStoreNames.contains('backups')) {
            db.createObjectStore('backups', { keyPath: 'id' });
          }
        }
      });

      // Load backup preferences
      this.loadBackupPreferences();

      return this.db;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  static loadBackupPreferences() {
    try {
      const savedMethod = localStorage.getItem('backupMethod');
      const silentMode = localStorage.getItem('silentBackup') === 'true';
      
      if (savedMethod) {
        this.backupMethod = savedMethod;
      }
      
      this.silentBackup = silentMode;
    } catch (error) {
      console.warn('Failed to load backup preferences:', error);
    }
  }

  static setBackupMethod(method) {
    this.backupMethod = method;
    localStorage.setItem('backupMethod', method);
  }

  static setSilentBackup(silent) {
    this.silentBackup = silent;
    localStorage.setItem('silentBackup', silent.toString());
  }

  static async testBackupMethod(method) {
    try {
      if (method === 'filesystem') {
        if (!('showSaveFilePicker' in window)) {
          return { 
            success: false, 
            error: 'File System Access API is not supported in this browser. Please use a modern Chrome, Edge, or Safari browser.' 
          };
        }

        // Test if we can access the API (user might cancel, but that's OK)
        try {
          const testData = JSON.stringify({ test: 'data' }, null, 2);
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: 'test_backup.json',
            types: [{
              description: 'JSON files',
              accept: { 'application/json': ['.json'] }
            }]
          });

          const writable = await fileHandle.createWritable();
          await writable.write(testData);
          await writable.close();

          return { success: true, method: 'filesystem' };
        } catch (fsError) {
          if (fsError.name === 'AbortError') {
            return { success: true, method: 'filesystem', note: 'Test cancelled by user, but method is available' };
          }
          throw fsError;
        }
      } else {
        // Test download method
        const testData = JSON.stringify({ test: 'data' }, null, 2);
        const blob = new Blob([testData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'test_backup.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        return { success: true, method: 'download' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static migrateData(data) {
    if (!data || typeof data !== 'object') {
      return {
        properties: [],
        loans: [],
        transactions: [],
        settings: { 
          financialYearStart: '07-01',
          notifications: []
        }
      };
    }

    try {
      const migrated = { ...data };

      // Migrate properties
      if (Array.isArray(migrated.properties)) {
        migrated.properties = migrated.properties.map(property => {
          if (!property || typeof property !== 'object') return null;
          
          const migratedProperty = { ...property };

          // Migrate old purchasePrice to new structure
          if (migratedProperty.purchasePrice && !migratedProperty.basePropertyCost) {
            migratedProperty.basePropertyCost = sanitize(migratedProperty.purchasePrice);
            migratedProperty.acquisitionCosts = Array.isArray(migratedProperty.acquisitionCosts) ? migratedProperty.acquisitionCosts : [];
          }

          // Ensure required fields exist with safe defaults
          migratedProperty.basePropertyCost = sanitize(migratedProperty.basePropertyCost || migratedProperty.purchasePrice);
          migratedProperty.acquisitionCosts = Array.isArray(migratedProperty.acquisitionCosts) ? migratedProperty.acquisitionCosts : [];
          migratedProperty.sellingPrice = sanitize(migratedProperty.sellingPrice);
          migratedProperty.sellingCosts = Array.isArray(migratedProperty.sellingCosts) ? migratedProperty.sellingCosts : [];
          migratedProperty.cgt = sanitize(migratedProperty.cgt);
          migratedProperty.currentValue = sanitize(migratedProperty.currentValue) || migratedProperty.basePropertyCost;

          // Ensure rentals array exists
          migratedProperty.rentals = Array.isArray(migratedProperty.rentals) ? migratedProperty.rentals : [];

          // Ensure ID exists
          if (!migratedProperty.id) {
            migratedProperty.id = `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          }

          return migratedProperty;
        }).filter(Boolean); // Remove null entries
      } else {
        migrated.properties = [];
      }

      // Ensure all arrays exist with proper data structure
      migrated.loans = Array.isArray(migrated.loans) ? migrated.loans.map(loan => {
        if (!loan || typeof loan !== 'object') return null;
        
        // Ensure dates are in ISO format
        if (loan.startDate && !loan.startDate.includes('T')) {
          loan.startDate = loan.startDate.includes('-') ? loan.startDate : new Date().toISOString().split('T')[0];
        }
        
        return loan;
      }).filter(Boolean) : [];

      migrated.transactions = Array.isArray(migrated.transactions) ? migrated.transactions.map(transaction => {
        if (!transaction || typeof transaction !== 'object') return null;
        
        // Ensure dates are in ISO format
        if (transaction.date && !transaction.date.includes('T')) {
          transaction.date = transaction.date.includes('-') ? transaction.date : new Date().toISOString().split('T')[0];
        }
        
        return transaction;
      }).filter(Boolean) : [];

      // Ensure settings exist with proper structure
      migrated.settings = migrated.settings && typeof migrated.settings === 'object' ? {
        financialYearStart: '07-01',
        notifications: [],
        ...migrated.settings
      } : { 
        financialYearStart: '07-01',
        notifications: []
      };

      return migrated;
    } catch (error) {
      console.error('Error during data migration:', error);
      return {
        properties: [],
        loans: [],
        transactions: [],
        settings: { 
          financialYearStart: '07-01',
          notifications: []
        }
      };
    }
  }

  // Generate fresh 5-year demo dataset with ISO dates
  static generateDemoData() {
    const today = new Date();
    const startDate = new Date(today.getFullYear() - 3, today.getMonth(), today.getDate());
    const endDate = new Date(today.getFullYear() + 2, today.getMonth(), today.getDate());
    
    // Convert dates to ISO strings
    const toISO = (date) => date.toISOString().split('T')[0];
    
    const properties = [];
    const loans = [];
    const transactions = [];
    
    const addresses = [
      { address: '123 Maple Street', city: 'Melbourne', state: 'VIC', zipCode: '3000' },
      { address: '456 Oak Avenue', city: 'Sydney', state: 'NSW', zipCode: '2000' },
      { address: '789 Pine Road', city: 'Brisbane', state: 'QLD', zipCode: '4000' },
      { address: '321 Elm Drive', city: 'Perth', state: 'WA', zipCode: '6000' },
      { address: '654 Cedar Lane', city: 'Adelaide', state: 'SA', zipCode: '5000' }
    ];
    
    const lenders = ['Commonwealth Bank', 'Westpac', 'ANZ', 'NAB', 'Macquarie Bank'];
    const frequencies = ['weekly', 'fortnightly', 'monthly'];
    
    // Generate 5 properties with rentals, loans, and transactions
    for (let i = 0; i < 5; i++) {
      const propertyId = `prop_${Date.now()}_${i}`;
      const address = addresses[i];
      const frequency = frequencies[i % 3]; // Mix of frequencies
      
      // Property with rental
      const rentAmount = 400 + (i * 100); // $400-$800 range
      const property = {
        id: propertyId,
        ...address,
        propertyType: 'house',
        bedrooms: 3 + (i % 2),
        bathrooms: 2,
        parkingSpaces: 1 + (i % 2),
        basePropertyCost: 450000 + (i * 50000),
        currentValue: 500000 + (i * 60000),
        acquisitionCosts: [],
        sellingCosts: [],
        cgt: 0,
        rentals: [{
          id: `rental_${propertyId}`,
          tenantName: `Tenant ${i + 1}`,
          amount: rentAmount,
          frequency: frequency,
          startDate: toISO(new Date(startDate.getTime() + (i * 30 * 24 * 60 * 60 * 1000))),
          endDate: toISO(new Date(endDate.getTime() - (i * 15 * 24 * 60 * 60 * 1000))),
          managementFeeRate: 0.08 + (i * 0.01), // 8-12% management fee
          status: 'active'
        }],
        expenses: [],
        notes: `Demo property ${i + 1} with ${frequency} rent`
      };
      properties.push(property);
      
      // Loan for each property
      const loanAmount = property.basePropertyCost * 0.8; // 80% LVR
      const loan = {
        id: `loan_${propertyId}`,
        propertyId: propertyId,
        lender: lenders[i % lenders.length],
        loanType: 'conventional',
        originalAmount: loanAmount,
        currentBalance: loanAmount * (0.9 - (i * 0.05)), // Varying balances
        interestRate: 5.5 + (i * 0.2), // 5.5% - 6.3%
        loanTerm: 30,
        monthlyPayment: (loanAmount * 0.006), // Approximate monthly payment
        startDate: toISO(new Date(startDate.getTime() + (i * 30 * 24 * 60 * 60 * 1000))),
        status: 'active',
        createdAt: toISO(today),
        updatedAt: toISO(today)
      };
      loans.push(loan);
      
      // Generate transactions for each property over the 5-year period
      let currentDate = new Date(startDate);
      let transactionId = 1;
      
      while (currentDate <= endDate) {
        // Monthly loan payment
        if (currentDate.getDate() === 15) { // 15th of each month
          transactions.push({
            id: `txn_${propertyId}_${transactionId++}`,
            propertyId: propertyId,
            type: 'expense',
            category: 'Loan Payment',
            description: `Monthly loan payment - ${loan.lender}`,
            amount: -loan.monthlyPayment,
            date: toISO(currentDate),
            payee: loan.lender
          });
        }
        
        // Quarterly maintenance expenses
        if (currentDate.getMonth() % 3 === 0 && currentDate.getDate() === 10) {
          const maintenanceAmount = 200 + Math.random() * 300;
          transactions.push({
            id: `txn_${propertyId}_${transactionId++}`,
            propertyId: propertyId,
            type: 'expense',
            category: 'Maintenance',
            description: 'Property maintenance and repairs',
            amount: -maintenanceAmount,
            date: toISO(currentDate),
            payee: 'Local Handyman Services'
          });
        }
        
        // Annual insurance
        if (currentDate.getMonth() === 6 && currentDate.getDate() === 1) { // July 1st
          transactions.push({
            id: `txn_${propertyId}_${transactionId++}`,
            propertyId: propertyId,
            type: 'expense',
            category: 'Insurance',
            description: 'Annual property insurance',
            amount: -(800 + i * 100),
            date: toISO(currentDate),
            payee: 'Insurance Australia'
          });
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    
    return {
      properties,
      loans,
      transactions,
      settings: { 
        financialYearStart: '07-01',
        notifications: []
      }
    };
  }

  // Reset all data to empty state
  static getEmptyData() {
    return {
      properties: [],
      loans: [],
      transactions: [],
      settings: { 
        financialYearStart: '07-01',
        notifications: []
      }
    };
  }

  static async saveData(data) {
    try {
      const db = await this.initDB();
      
      // Migrate and validate data first
      const migratedData = this.migrateData(data);
      
      // Use a transaction for atomic saves
      const tx = db.transaction(['properties', 'loans', 'transactions', 'settings'], 'readwrite');

      // Clear existing data first
      await Promise.all([
        tx.objectStore('properties').clear(),
        tx.objectStore('loans').clear(),
        tx.objectStore('transactions').clear()
      ]);

      // Save properties
      if (Array.isArray(migratedData.properties)) {
        for (const property of migratedData.properties) {
          if (property && property.id) {
            await tx.objectStore('properties').put(property);
          }
        }
      }

      // Save loans
      if (Array.isArray(migratedData.loans)) {
        for (const loan of migratedData.loans) {
          if (loan && loan.id) {
            await tx.objectStore('loans').put(loan);
          }
        }
      }

      // Save transactions
      if (Array.isArray(migratedData.transactions)) {
        for (const transaction of migratedData.transactions) {
          if (transaction && transaction.id) {
            await tx.objectStore('transactions').put(transaction);
          }
        }
      }

      // Save settings - clear first, then add
      await tx.objectStore('settings').clear();
      if (migratedData.settings && typeof migratedData.settings === 'object') {
        for (const [key, value] of Object.entries(migratedData.settings)) {
          await tx.objectStore('settings').put({ key, value });
        }
      }

      await tx.done;

      // Broadcast sync event to other tabs
      this.broadcastSync();
      
      console.log('Data saved successfully');
    } catch (error) {
      console.error('Failed to save data:', error);
      throw error;
    }
  }

  static async loadAllData() {
    try {
      const db = await this.initDB();

      // Load all data in parallel with proper error handling
      const [properties, loans, transactions, settingsArray] = await Promise.all([
        db.getAll('properties').catch(err => {
          console.warn('Failed to load properties:', err);
          return [];
        }),
        db.getAll('loans').catch(err => {
          console.warn('Failed to load loans:', err);
          return [];
        }),
        db.getAll('transactions').catch(err => {
          console.warn('Failed to load transactions:', err);
          return [];
        }),
        db.getAll('settings').catch(err => {
          console.warn('Failed to load settings:', err);
          return [];
        })
      ]);

      // Convert settings array back to object
      const settings = {};
      if (Array.isArray(settingsArray)) {
        settingsArray.forEach(setting => {
          if (setting && setting.key) {
            settings[setting.key] = setting.value;
          }
        });
      }

      const data = {
        properties: Array.isArray(properties) ? properties.filter(Boolean) : [],
        loans: Array.isArray(loans) ? loans.filter(Boolean) : [],
        transactions: Array.isArray(transactions) ? transactions.filter(Boolean) : [],
        settings: Object.keys(settings).length > 0 ? {
          financialYearStart: '07-01',
          notifications: [],
          ...settings
        } : { 
          financialYearStart: '07-01',
          notifications: []
        }
      };

      return this.migrateData(data);
    } catch (error) {
      console.error('Failed to load data:', error);
      return {
        properties: [],
        loans: [],
        transactions: [],
        settings: { 
          financialYearStart: '07-01',
          notifications: []
        }
      };
    }
  }

  static generateBackupFilename() {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');

      return `InvestmentPropertyManagerPro_backup_${year}${month}${day}_${hours}${minutes}${seconds}.json`;
    } catch (error) {
      console.error('Error generating backup filename:', error);
      return `InvestmentPropertyManagerPro_backup_${Date.now()}.json`;
    }
  }

  static async exportBackup(filename) {
    try {
      const data = await this.loadAllData();
      const jsonString = JSON.stringify(data, null, 2);
      
      // Update last backup timestamp
      localStorage.setItem('lastAutoBackup', new Date().toISOString());

      // Use saved backup method preference
      if (this.backupMethod === 'filesystem' && 'showSaveFilePicker' in window) {
        try {
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: filename || this.generateBackupFilename(),
            types: [{
              description: 'JSON files',
              accept: { 'application/json': ['.json'] }
            }]
          });

          const writable = await fileHandle.createWritable();
          await writable.write(jsonString);
          await writable.close();

          return { success: true, method: 'filesystem' };
        } catch (fsError) {
          if (fsError.name === 'AbortError') {
            return { success: false, error: 'User cancelled' };
          }
          // Fall back to download if File System Access fails
          console.warn('File System Access API failed, falling back to download:', fsError);
        }
      }

      // Fallback to download or if download method is preferred
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || this.generateBackupFilename();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return { success: true, method: 'download' };
    } catch (error) {
      console.error('Export backup failed:', error);
      return { success: false, error: error.message };
    }
  }

  static async importAll(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Run migration and recompute derived values
      const migratedData = this.migrateData(data);
      await this.saveData(migratedData);
      
      return { success: true };
    } catch (error) {
      console.error('Import failed:', error);
      return { success: false, error: error.message };
    }
  }

  static async importBackup(file) {
    return this.importAll(file);
  }

  static broadcastChannel = null;

  static initMultiTabSync() {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        if (this.broadcastChannel) {
          this.broadcastChannel.close();
        }
        
        this.broadcastChannel = new BroadcastChannel('investment-manager-sync');
        this.broadcastChannel.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'data-updated') {
            window.dispatchEvent(new CustomEvent('data-sync-update'));
          }
        });
      } else {
        // Fallback to storage events for older browsers
        window.addEventListener('storage', (event) => {
          if (event.key === 'investment-manager-sync') {
            window.dispatchEvent(new CustomEvent('data-sync-update'));
          }
        });
      }
    } catch (error) {
      console.warn('Failed to initialize multi-tab sync:', error);
    }
  }

  static broadcastSync() {
    try {
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({ type: 'data-updated', timestamp: Date.now() });
      } else {
        // Fallback to localStorage
        localStorage.setItem('investment-manager-sync', Date.now().toString());
        localStorage.removeItem('investment-manager-sync'); // Clean up immediately
      }
    } catch (error) {
      console.warn('Failed to broadcast sync:', error);
    }
  }

  static async exportAll(format = 'json', startDate = null, endDate = null) {
    try {
      const data = await this.loadAllData();
      
      if (format === 'json') {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const filename = `investment_data_export_${new Date().toISOString().slice(0, 10)}.json`;
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        return { success: true };
      }
      
      if (format === 'csv') {
        // Filter transactions by date range if provided
        let transactions = data.transactions || [];
        
        if (startDate) {
          transactions = transactions.filter(t => new Date(t.date) >= new Date(startDate));
        }
        
        if (endDate) {
          transactions = transactions.filter(t => new Date(t.date) <= new Date(endDate));
        }

        // CSV export for transactions
        const csvContent = this.convertToCSV(transactions);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        
        let filename = 'transactions_export';
        if (startDate || endDate) {
          filename += `_${startDate || 'beginning'}_to_${endDate || 'present'}`;
        }
        filename += `_${new Date().toISOString().slice(0, 10)}.csv`;
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        return { success: true };
      }

      return { success: false, error: 'Unsupported format' };
    } catch (error) {
      console.error('Export failed:', error);
      return { success: false, error: error.message };
    }
  }

  // New method specifically for exporting transactions with date filtering
  static async exportTransactions(transactions, startDate = null, endDate = null) {
    try {
      let filteredTransactions = [...transactions];
      
      // Apply date filtering
      if (startDate) {
        filteredTransactions = filteredTransactions.filter(t => 
          new Date(t.date) >= new Date(startDate)
        );
      }
      
      if (endDate) {
        filteredTransactions = filteredTransactions.filter(t => 
          new Date(t.date) <= new Date(endDate)
        );
      }

      const csvContent = this.convertToCSV(filteredTransactions);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      
      // Generate filename with date range
      let filename = 'filtered_transactions';
      if (startDate || endDate) {
        const start = startDate ? new Date(startDate).toISOString().slice(0, 10) : 'beginning';
        const end = endDate ? new Date(endDate).toISOString().slice(0, 10) : 'present';
        filename += `_${start}_to_${end}`;
      }
      filename += `_${new Date().toISOString().slice(0, 10)}.csv`;
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      console.error('Transaction export failed:', error);
      return { success: false, error: error.message };
    }
  }

  static convertToCSV(data) {
    try {
      if (!Array.isArray(data) || data.length === 0) {
        return 'No data available';
      }

      const headers = Object.keys(data[0] || {});
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            return typeof value === 'string' && value.includes(',') 
              ? `"${value.replace(/"/g, '""')}"` 
              : value;
          }).join(',')
        )
      ].join('\n');

      return csvContent;
    } catch (error) {
      console.error('Error converting to CSV:', error);
      return 'Error converting data to CSV';
    }
  }

  static async getStorageUsage() {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage || 0,
          quota: estimate.quota || 0,
          percentage: estimate.quota ? (estimate.usage / estimate.quota) * 100 : 0
        };
      }
      
      // Fallback: estimate based on JSON size
      const data = await this.loadAllData();
      const jsonSize = JSON.stringify(data).length * 2; // Rough estimate (UTF-16)
      return {
        used: jsonSize,
        quota: 50 * 1024 * 1024, // Assume 50MB quota
        percentage: (jsonSize / (50 * 1024 * 1024)) * 100
      };
    } catch (error) {
      console.warn('Failed to get storage usage:', error);
      return { used: 0, quota: 0, percentage: 0 };
    }
  }
}

export default DataManager;
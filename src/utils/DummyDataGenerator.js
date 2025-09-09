import { sanitizeNumberInput } from './number';

class DummyDataGenerator {
  static generateDummyData() {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    
    try {
      // Generate 5 properties with diverse data
      const properties = [
        {
          id: 'prop_melbourne_cbd',
          name: 'Melbourne CBD Apartment',
          address: '123 Collins Street, Melbourne VIC 3000',
          propertyType: 'Residential',
          basePropertyCost: 650000,
          acquisitionCosts: [
            { id: 'acq_mel_1', category: 'Stamp Duty', amount: 32500, notes: 'Victorian stamp duty' },
            { id: 'acq_mel_2', category: 'Legal Fees', amount: 1800, notes: 'Conveyancing and legal' },
            { id: 'acq_mel_3', category: 'Building Inspection', amount: 600, notes: 'Building and pest inspection' },
            { id: 'acq_mel_4', category: 'Loan Establishment', amount: 1200, notes: 'Bank fees' }
          ],
          sellingPrice: 0,
          sellingCosts: [],
          cgt: 0,
          currentValue: 720000,
          purchaseDate: '2023-02-15',
          notes: 'Prime CBD location with excellent rental yield',
          createdAt: '2023-02-15T00:00:00.000Z',
          updatedAt: new Date().toISOString()
        },
        {
          id: 'prop_gold_coast_unit',
          name: 'Gold Coast Beachfront Unit',
          address: '456 Surfers Paradise Blvd, Gold Coast QLD 4217',
          propertyType: 'Residential',
          basePropertyCost: 480000,
          acquisitionCosts: [
            { id: 'acq_gc_1', category: 'Stamp Duty', amount: 19200, notes: 'Queensland stamp duty' },
            { id: 'acq_gc_2', category: 'Legal Fees', amount: 1200, notes: 'Legal and conveyancing' },
            { id: 'acq_gc_3', category: 'Valuation', amount: 500, notes: 'Bank valuation' },
            { id: 'acq_gc_4', category: 'Strata Report', amount: 300, notes: 'Strata inspection' }
          ],
          sellingPrice: 0,
          sellingCosts: [],
          cgt: 0,
          currentValue: 520000,
          purchaseDate: '2023-06-20',
          notes: 'Tourist hotspot with strong holiday rental potential',
          createdAt: '2023-06-20T00:00:00.000Z',
          updatedAt: new Date().toISOString()
        },
        {
          id: 'prop_sydney_townhouse',
          name: 'Sydney Western Suburbs Townhouse',
          address: '789 Great Western Highway, Parramatta NSW 2150',
          propertyType: 'Residential',
          basePropertyCost: 850000,
          acquisitionCosts: [
            { id: 'acq_syd_1', category: 'Stamp Duty', amount: 34000, notes: 'NSW stamp duty' },
            { id: 'acq_syd_2', category: 'Legal Fees', amount: 2000, notes: 'Conveyancing and legal fees' },
            { id: 'acq_syd_3', category: 'Building Inspection', amount: 800, notes: 'Comprehensive building inspection' },
            { id: 'acq_syd_4', category: 'Loan Fees', amount: 1500, notes: 'Bank establishment and valuation' }
          ],
          sellingPrice: 950000,
          sellingCosts: [
            { id: 'sell_syd_1', category: 'Agent Commission', amount: 23750, notes: '2.5% real estate commission' },
            { id: 'sell_syd_2', category: 'Legal Fees', amount: 1500, notes: 'Selling legal costs' },
            { id: 'sell_syd_3', category: 'Marketing', amount: 3000, notes: 'Photography, styling, advertising' }
          ],
          cgt: 18000,
          currentValue: 950000,
          purchaseDate: '2023-09-10',
          notes: 'Family-friendly area, sold in early 2025 for good profit',
          createdAt: '2023-09-10T00:00:00.000Z',
          updatedAt: new Date().toISOString()
        },
        {
          id: 'prop_brisbane_house',
          name: 'Brisbane Northside Family Home',
          address: '321 Gympie Road, Kedron QLD 4031',
          propertyType: 'Residential',
          basePropertyCost: 720000,
          acquisitionCosts: [
            { id: 'acq_bris_1', category: 'Stamp Duty', amount: 28800, notes: 'Queensland stamp duty' },
            { id: 'acq_bris_2', category: 'Legal Fees', amount: 1600, notes: 'Legal and conveyancing' },
            { id: 'acq_bris_3', category: 'Building Inspection', amount: 700, notes: 'Building and pest inspection' },
            { id: 'acq_bris_4', category: 'Loan Establishment', amount: 1000, notes: 'Bank fees and valuation' }
          ],
          sellingPrice: 0,
          sellingCosts: [],
          cgt: 0,
          currentValue: 780000,
          purchaseDate: '2024-01-25',
          notes: 'Great school catchment, strong capital growth potential',
          createdAt: '2024-01-25T00:00:00.000Z',
          updatedAt: new Date().toISOString()
        },
        {
          id: 'prop_perth_apartment',
          name: 'Perth City Edge Apartment',
          address: '555 Murray Street, Perth WA 6000',
          propertyType: 'Residential',
          basePropertyCost: 420000,
          acquisitionCosts: [
            { id: 'acq_per_1', category: 'Stamp Duty', amount: 16800, notes: 'WA stamp duty' },
            { id: 'acq_per_2', category: 'Legal Fees', amount: 1100, notes: 'Conveyancing fees' },
            { id: 'acq_per_3', category: 'Building Inspection', amount: 500, notes: 'Building inspection' },
            { id: 'acq_per_4', category: 'Strata Report', amount: 400, notes: 'Strata inspection and review' }
          ],
          sellingPrice: 0,
          sellingCosts: [],
          cgt: 0,
          currentValue: 440000,
          purchaseDate: '2024-05-12',
          notes: 'Close to public transport and entertainment district',
          createdAt: '2024-05-12T00:00:00.000Z',
          updatedAt: new Date().toISOString()
        }
      ];

      // Generate comprehensive loans for each property
      const loans = [
        {
          id: 'loan_melbourne_cbd',
          propertyId: 'prop_melbourne_cbd',
          name: 'Melbourne CBD Apartment Mortgage',
          originalAmount: 520000,
          startDate: '2023-02-15',
          endDate: '2053-02-15',
          paymentType: 'Principal + Interest',
          interestRate: 5.8,
          regularPaymentAmount: 3200,
          frequency: 'Monthly',
          createdAt: '2023-02-15T00:00:00.000Z'
        },
        {
          id: 'loan_gold_coast_unit',
          propertyId: 'prop_gold_coast_unit',
          name: 'Gold Coast Unit Investment Loan',
          originalAmount: 384000,
          startDate: '2023-06-20',
          endDate: '2053-06-20',
          paymentType: 'Principal + Interest',
          interestRate: 5.5,
          regularPaymentAmount: 2400,
          frequency: 'Monthly',
          createdAt: '2023-06-20T00:00:00.000Z'
        },
        {
          id: 'loan_sydney_townhouse',
          propertyId: 'prop_sydney_townhouse',
          name: 'Sydney Townhouse Mortgage',
          originalAmount: 680000,
          startDate: '2023-09-10',
          endDate: '2053-09-10',
          paymentType: 'Principal + Interest',
          interestRate: 6.1,
          regularPaymentAmount: 4200,
          frequency: 'Monthly',
          createdAt: '2023-09-10T00:00:00.000Z'
        },
        {
          id: 'loan_brisbane_house',
          propertyId: 'prop_brisbane_house',
          name: 'Brisbane Family Home Loan',
          originalAmount: 576000,
          startDate: '2024-01-25',
          endDate: '2054-01-25',
          paymentType: 'Principal + Interest',
          interestRate: 5.9,
          regularPaymentAmount: 3600,
          frequency: 'Monthly',
          createdAt: '2024-01-25T00:00:00.000Z'
        },
        {
          id: 'loan_perth_apartment',
          propertyId: 'prop_perth_apartment',
          name: 'Perth Apartment Investment Loan',
          originalAmount: 336000,
          startDate: '2024-05-12',
          endDate: '2054-05-12',
          paymentType: 'Principal + Interest',
          interestRate: 5.7,
          regularPaymentAmount: 2100,
          frequency: 'Monthly',
          createdAt: '2024-05-12T00:00:00.000Z'
        }
      ];

      // Generate comprehensive transactions from 2023 to 2027
      const transactions = [];
      let transactionId = 1;

      // Helper function to add months to a date
      const addMonths = (date, months) => {
        const result = new Date(date);
        result.setMonth(result.getMonth() + months);
        return result;
      };

      // Property-specific rental rates and expenses
      const propertyData = {
        'prop_melbourne_cbd': { 
          weeklyRent: 650, 
          monthlyRent: 2817, 
          management: 8, 
          insurance: 1800, 
          councilRates: 1200,
          bodyCorpFees: 2400
        },
        'prop_gold_coast_unit': { 
          weeklyRent: 520, 
          monthlyRent: 2253, 
          management: 8, 
          insurance: 1200, 
          councilRates: 900,
          bodyCorpFees: 1800
        },
        'prop_sydney_townhouse': { 
          weeklyRent: 750, 
          monthlyRent: 3250, 
          management: 7, 
          insurance: 2000, 
          councilRates: 1800,
          bodyCorpFees: 0
        },
        'prop_brisbane_house': { 
          weeklyRent: 680, 
          monthlyRent: 2947, 
          management: 7.5, 
          insurance: 1600, 
          councilRates: 1400,
          bodyCorpFees: 0
        },
        'prop_perth_apartment': { 
          weeklyRent: 450, 
          monthlyRent: 1950, 
          management: 8.5, 
          insurance: 1000, 
          councilRates: 800,
          bodyCorpFees: 1500
        }
      };

      // Generate transactions for each property from purchase date to 2027
      properties.forEach(property => {
        const startDate = new Date(property.purchaseDate);
        const endDate = property.sellingPrice > 0 ? new Date('2025-01-31') : new Date('2027-12-31');
        const propData = propertyData[property.id];
        
        if (!propData) return;

        let currentDate = new Date(startDate);
        currentDate.setDate(1); // Start from the first of the month

        // Monthly transactions
        while (currentDate <= endDate) {
          const year = currentDate.getFullYear();
          const month = currentDate.getMonth();
          
          // Monthly rental income (with 3% annual increases)
          const yearsSinceStart = year - startDate.getFullYear();
          const adjustedRent = Math.round(propData.monthlyRent * Math.pow(1.03, yearsSinceStart));
          
          transactions.push({
            id: `trans_${transactionId++}`,
            propertyId: property.id,
            type: 'income',
            category: 'Rental Income',
            amount: adjustedRent,
            date: currentDate.toISOString().split('T')[0],
            description: `Monthly rent - ${property.name}`,
            isAutoGenerated: false
          });

          // Property management fees
          transactions.push({
            id: `trans_${transactionId++}`,
            propertyId: property.id,
            type: 'expense',
            category: 'Management Fees',
            amount: Math.round(adjustedRent * (propData.management / 100)),
            date: currentDate.toISOString().split('T')[0],
            description: `Property management (${propData.management}%) - ${property.name}`,
            isAutoGenerated: false
          });

          currentDate = addMonths(currentDate, 1);
        }

        // Annual expenses
        for (let year = startDate.getFullYear(); year <= Math.min(2027, endDate.getFullYear()); year++) {
          // Insurance (annual, with 4% increases)
          const yearsSinceStart = year - startDate.getFullYear();
          const adjustedInsurance = Math.round(propData.insurance * Math.pow(1.04, yearsSinceStart));
          
          const insuranceDate = new Date(year, startDate.getMonth(), startDate.getDate());
          if (insuranceDate >= startDate && insuranceDate <= endDate) {
            transactions.push({
              id: `trans_${transactionId++}`,
              propertyId: property.id,
              type: 'expense',
              category: 'Insurance',
              amount: adjustedInsurance,
              date: insuranceDate.toISOString().split('T')[0],
              description: `Property insurance ${year} - ${property.name}`,
              isAutoGenerated: false
            });
          }

          // Council rates (quarterly)
          const quarterlyRates = Math.round((propData.councilRates * Math.pow(1.05, yearsSinceStart)) / 4);
          for (let quarter = 0; quarter < 4; quarter++) {
            const quarterDate = new Date(year, quarter * 3, 15);
            if (quarterDate >= startDate && quarterDate <= endDate) {
              transactions.push({
                id: `trans_${transactionId++}`,
                propertyId: property.id,
                type: 'expense',
                category: 'Council Rates',
                amount: quarterlyRates,
                date: quarterDate.toISOString().split('T')[0],
                description: `Council rates Q${quarter + 1} ${year} - ${property.name}`,
                isAutoGenerated: false
              });
            }
          }

          // Body corporate fees (quarterly for apartments/units)
          if (propData.bodyCorpFees > 0) {
            const quarterlyBodyCorp = Math.round((propData.bodyCorpFees * Math.pow(1.06, yearsSinceStart)) / 4);
            for (let quarter = 0; quarter < 4; quarter++) {
              const bcDate = new Date(year, quarter * 3 + 1, 1);
              if (bcDate >= startDate && bcDate <= endDate) {
                transactions.push({
                  id: `trans_${transactionId++}`,
                  propertyId: property.id,
                  type: 'expense',
                  category: 'Body Corporate',
                  amount: quarterlyBodyCorp,
                  date: bcDate.toISOString().split('T')[0],
                  description: `Body corporate fees Q${quarter + 1} ${year} - ${property.name}`,
                  isAutoGenerated: false
                });
              }
            }
          }

          // Maintenance expenses (various throughout the year)
          const maintenanceEvents = [
            { month: 1, amount: 300, desc: 'Garden maintenance', chance: 0.7 },
            { month: 3, amount: 800, desc: 'Plumbing repair', chance: 0.4 },
            { month: 5, amount: 1200, desc: 'Interior touch-up painting', chance: 0.3 },
            { month: 7, amount: 450, desc: 'Carpet cleaning', chance: 0.8 },
            { month: 9, amount: 600, desc: 'Appliance service', chance: 0.5 },
            { month: 11, amount: 350, desc: 'Gutter cleaning', chance: 0.6 }
          ];

          maintenanceEvents.forEach(event => {
            const eventDate = new Date(year, event.month - 1, Math.floor(Math.random() * 28) + 1);
            if (eventDate >= startDate && eventDate <= endDate && Math.random() < event.chance) {
              const adjustedAmount = Math.round(event.amount * (0.8 + Math.random() * 0.4)); // ±20% variation
              transactions.push({
                id: `trans_${transactionId++}`,
                propertyId: property.id,
                type: 'expense',
                category: 'Maintenance',
                amount: adjustedAmount,
                date: eventDate.toISOString().split('T')[0],
                description: `${event.desc} - ${property.name}`,
                isAutoGenerated: false
              });
            }
          });

          // Major maintenance every few years
          if (yearsSinceStart > 0 && yearsSinceStart % 3 === 0) {
            const majorMaintenanceDate = new Date(year, 6, 15); // Mid-year
            if (majorMaintenanceDate >= startDate && majorMaintenanceDate <= endDate) {
              const majorCosts = [
                { amount: 3500, desc: 'Kitchen renovation' },
                { amount: 2800, desc: 'Bathroom renovation' },
                { amount: 4200, desc: 'Flooring replacement' },
                { amount: 2200, desc: 'External painting' },
                { amount: 1800, desc: 'Air conditioning service' }
              ];
              const majorCost = majorCosts[Math.floor(Math.random() * majorCosts.length)];
              
              transactions.push({
                id: `trans_${transactionId++}`,
                propertyId: property.id,
                type: 'expense',
                category: 'Major Maintenance',
                amount: majorCost.amount,
                date: majorMaintenanceDate.toISOString().split('T')[0],
                description: `${majorCost.desc} - ${property.name}`,
                isAutoGenerated: false
              });
            }
          }
        }
      });

      // Generate loan interest transactions
      loans.forEach(loan => {
        const startDate = new Date(loan.startDate);
        const endDate = new Date(Math.min(new Date('2027-12-31').getTime(), new Date(loan.endDate).getTime()));
        
        let currentDate = new Date(startDate);
        const monthlyInterestRate = loan.interestRate / 100 / 12;
        let remainingBalance = loan.originalAmount;
        let paymentCount = 0;

        while (currentDate <= endDate && remainingBalance > 100) {
          const interestAmount = remainingBalance * monthlyInterestRate;
          const principalAmount = Math.max(0, loan.regularPaymentAmount - interestAmount);
          
          if (principalAmount > 0) {
            remainingBalance = Math.max(0, remainingBalance - principalAmount);
          }

          transactions.push({
            id: `trans_${transactionId++}`,
            propertyId: loan.propertyId,
            type: 'expense',
            category: 'Loan Interest',
            amount: Math.round(interestAmount),
            date: currentDate.toISOString().split('T')[0],
            description: `${loan.name} - Interest payment`,
            isAutoGenerated: true
          });

          currentDate = addMonths(currentDate, 1);
          paymentCount++;
          
          // Safety break after 5 years of payments per loan
          if (paymentCount > 60) break;
        }
      });

      // Add some capital improvements
      const capitalImprovements = [
        { propertyId: 'prop_melbourne_cbd', date: '2024-03-15', amount: 8500, desc: 'Kitchen upgrade' },
        { propertyId: 'prop_gold_coast_unit', date: '2024-07-20', amount: 6200, desc: 'Bathroom renovation' },
        { propertyId: 'prop_brisbane_house', date: '2024-09-10', amount: 12000, desc: 'Deck and landscaping' },
        { propertyId: 'prop_perth_apartment', date: '2025-02-28', amount: 4500, desc: 'Flooring upgrade' }
      ];

      capitalImprovements.forEach(improvement => {
        transactions.push({
          id: `trans_${transactionId++}`,
          propertyId: improvement.propertyId,
          type: 'expense',
          category: 'Capital Improvement',
          amount: improvement.amount,
          date: improvement.date,
          description: improvement.desc,
          isAutoGenerated: false
        });
      });

      return {
        properties,
        loans,
        transactions,
        settings: {
          financialYearStart: '07-01',
          currency: 'AUD',
          dateFormat: 'DD/MM/YYYY',
          defaultPropertyType: 'Residential',
          autoBackup: true,
          backupFrequency: 180000
        }
      };
    } catch (error) {
      console.error('Error generating dummy data:', error);
      return {
        properties: [],
        loans: [],
        transactions: [],
        settings: { financialYearStart: '07-01' }
      };
    }
  }

  static generateRandomProperty() {
    try {
      const propertyNames = [
        'City View Apartment', 'Riverside Unit', 'Garden Townhouse', 
        'Modern Studio', 'Heritage House', 'Coastal Villa',
        'Suburban Duplex', 'Inner City Loft', 'Beachside Retreat'
      ];
      
      const addresses = [
        '100 Queen Street, Brisbane QLD 4000',
        '250 Flinders Lane, Melbourne VIC 3000',
        '75 Pitt Street, Sydney NSW 2000',
        '50 King William Street, Adelaide SA 5000',
        '200 St Georges Terrace, Perth WA 6000',
        '88 Hunter Street, Newcastle NSW 2300',
        '150 North Terrace, Hobart TAS 7000'
      ];

      const randomIndex = Math.floor(Math.random() * propertyNames.length);
      const basePropertyCost = 350000 + Math.floor(Math.random() * 600000);
      
      return {
        id: `prop_${Date.now()}`,
        name: propertyNames[randomIndex],
        address: addresses[Math.floor(Math.random() * addresses.length)],
        propertyType: 'Residential',
        basePropertyCost: basePropertyCost,
        acquisitionCosts: [
          {
            id: `acq_${Date.now()}_1`,
            category: 'Stamp Duty',
            amount: Math.floor(basePropertyCost * 0.045),
            notes: 'State stamp duty'
          },
          {
            id: `acq_${Date.now()}_2`,
            category: 'Legal Fees',
            amount: 1200 + Math.floor(Math.random() * 800),
            notes: 'Conveyancing fees'
          }
        ],
        sellingPrice: 0,
        sellingCosts: [],
        cgt: 0,
        currentValue: basePropertyCost + Math.floor(Math.random() * 150000),
        purchaseDate: new Date(2023 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
        notes: 'Randomly generated property for testing',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating random property:', error);
      return null;
    }
  }
}

export default DummyDataGenerator;
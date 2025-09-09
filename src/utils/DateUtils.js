class DateUtils {
  static formatDate(date, format = 'DD/MM/YYYY') {
    if (!date) return '';
    
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      
      switch (format) {
        case 'DD/MM/YYYY':
          return `${day}/${month}/${year}`;
        case 'MM/DD/YYYY':
          return `${month}/${day}/${year}`;
        case 'YYYY-MM-DD':
          return `${year}-${month}-${day}`;
        case 'DD MMM YYYY':
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return `${day} ${months[d.getMonth()]} ${year}`;
        default:
          return d.toLocaleDateString();
      }
    } catch (error) {
      console.warn('Error formatting date:', error);
      return '';
    }
  }

  static formatShortDate(date) {
    if (!date) return '';
    
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      
      return d.toLocaleDateString('en-AU', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      console.warn('Error formatting short date:', error);
      return '';
    }
  }

  static formatFinancialYear(year) {
    try {
      const startYear = parseInt(year);
      const endYear = startYear + 1;
      return `FY ${startYear}-${endYear.toString().slice(-2)}`;
    } catch (error) {
      console.warn('Error formatting financial year:', error);
      return `FY ${year}`;
    }
  }

  static parseDate(dateString) {
    if (!dateString) return null;
    
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    } catch (error) {
      console.warn('Error parsing date:', error);
      return null;
    }
  }

  static isValidDate(date) {
    try {
      return date instanceof Date && !isNaN(date.getTime());
    } catch (error) {
      return false;
    }
  }

  static addMonths(date, months) {
    if (!this.isValidDate(date)) return null;
    
    try {
      const newDate = new Date(date);
      newDate.setMonth(newDate.getMonth() + months);
      return newDate;
    } catch (error) {
      console.warn('Error adding months to date:', error);
      return null;
    }
  }

  static addDays(date, days) {
    if (!this.isValidDate(date)) return null;
    
    try {
      const newDate = new Date(date);
      newDate.setDate(newDate.getDate() + days);
      return newDate;
    } catch (error) {
      console.warn('Error adding days to date:', error);
      return null;
    }
  }

  static getFinancialYearStart(date, startMonth = 7) {
    if (!this.isValidDate(date)) return null;
    
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      if (month >= startMonth) {
        return new Date(year, startMonth - 1, 1);
      } else {
        return new Date(year - 1, startMonth - 1, 1);
      }
    } catch (error) {
      console.warn('Error getting financial year start:', error);
      return null;
    }
  }

  static getFinancialYearEnd(date, startMonth = 7) {
    if (!this.isValidDate(date)) return null;
    
    try {
      const fyStart = this.getFinancialYearStart(date, startMonth);
      if (!fyStart) return null;
      
      const fyEnd = new Date(fyStart);
      fyEnd.setFullYear(fyEnd.getFullYear() + 1);
      fyEnd.setDate(fyEnd.getDate() - 1);
      return fyEnd;
    } catch (error) {
      console.warn('Error getting financial year end:', error);
      return null;
    }
  }

  static getDaysBetween(startDate, endDate) {
    if (!this.isValidDate(startDate) || !this.isValidDate(endDate)) return 0;
    
    try {
      const timeDiff = endDate.getTime() - startDate.getTime();
      return Math.ceil(timeDiff / (1000 * 3600 * 24));
    } catch (error) {
      console.warn('Error calculating days between dates:', error);
      return 0;
    }
  }

  static getMonthsBetween(startDate, endDate) {
    if (!this.isValidDate(startDate) || !this.isValidDate(endDate)) return 0;
    
    try {
      const yearDiff = endDate.getFullYear() - startDate.getFullYear();
      const monthDiff = endDate.getMonth() - startDate.getMonth();
      return yearDiff * 12 + monthDiff;
    } catch (error) {
      console.warn('Error calculating months between dates:', error);
      return 0;
    }
  }

  static isToday(date) {
    if (!this.isValidDate(date)) return false;
    
    try {
      const today = new Date();
      return date.toDateString() === today.toDateString();
    } catch (error) {
      return false;
    }
  }

  static isThisMonth(date) {
    if (!this.isValidDate(date)) return false;
    
    try {
      const today = new Date();
      return date.getFullYear() === today.getFullYear() && 
             date.getMonth() === today.getMonth();
    } catch (error) {
      return false;
    }
  }

  static isThisYear(date) {
    if (!this.isValidDate(date)) return false;
    
    try {
      const today = new Date();
      return date.getFullYear() === today.getFullYear();
    } catch (error) {
      return false;
    }
  }

  static getQuarter(date) {
    if (!this.isValidDate(date)) return 1;
    
    try {
      const month = date.getMonth() + 1;
      return Math.ceil(month / 3);
    } catch (error) {
      return 1;
    }
  }

  static getNextPaymentDate(startDate, frequency) {
    if (!this.isValidDate(startDate)) return null;
    
    try {
      const nextDate = new Date(startDate);
      
      switch (frequency) {
        case 'Weekly':
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case 'Fortnightly':
          nextDate.setDate(nextDate.getDate() + 14);
          break;
        case 'Monthly':
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case 'Quarterly':
          nextDate.setMonth(nextDate.getMonth() + 3);
          break;
        case 'Annually':
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
        default:
          nextDate.setMonth(nextDate.getMonth() + 1);
      }
      
      return nextDate;
    } catch (error) {
      console.warn('Error getting next payment date:', error);
      return null;
    }
  }

  static formatRelativeTime(date) {
    if (!this.isValidDate(date)) return '';
    
    try {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays === -1) return 'Tomorrow';
      if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < -1 && diffDays > -7) return `In ${Math.abs(diffDays)} days`;
      
      return this.formatDate(date, 'DD MMM YYYY');
    } catch (error) {
      console.warn('Error formatting relative time:', error);
      return this.formatDate(date);
    }
  }
}

export default DateUtils;
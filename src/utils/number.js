// src/utils/number.js
export function sanitizeNumberInput(raw) {
  if (raw === null || raw === undefined) return 0;
  let str = String(raw).trim();
  const isNegative = str.startsWith("-");
  if (isNegative) str = str.slice(1);
  // keep only digits, commas, dots
  str = str.replace(/[^\d.,]/g, "");

  if (str.includes(",") && str.includes(".")) {
    const lastComma = str.lastIndexOf(",");
    const lastDot = str.lastIndexOf(".");
    if (lastComma > lastDot) {
      // comma is decimal, dots are grouping
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      // dot is decimal, commas are grouping
      str = str.replace(/,/g, "");
    }
  } else if (str.includes(",")) {
    // commas as grouping
    str = str.replace(/,/g, "");
  }

  // at most 2 decimals
  if (!/^\d*(\.\d{0,2})?$/.test(str)) return 0;

  const num = parseFloat(str);
  return Number.isFinite(num) ? (isNegative ? -num : num) : 0;
}

export function parseCurrency(input) {
  return sanitizeNumberInput(input);
}

export function formatForInput(value) {
  if (value === null || value === undefined || isNaN(value)) return "";
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    useGrouping: true,
  });
}

export function formatCurrency(value, currency = "USD") {
  if (value === null || value === undefined || isNaN(value)) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

// FIXED: Add formatCurrencyForChart for better chart display - NO COMPACT NOTATION
export function formatCurrencyForChart(value, currency = "USD") {
  if (value === null || value === undefined || isNaN(value)) return "";
  
  // For chart labels, show full currency amounts without compact notation
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0, // No decimals for chart labels to save space
  }).format(Number(value));
}

// Add formatForExport for CSV exports
export function formatForExport(value) {
  if (value === null || value === undefined || isNaN(value)) return "0";
  return Number(value).toFixed(2);
}

// Keep legacy exports for compatibility
export const sanitize = sanitizeNumberInput;
export const formatCurrencyValue = formatCurrency;

// Default export for backward compatibility
export default {
  sanitize: sanitizeNumberInput,
  sanitizeNumberInput,
  parseCurrency,
  formatForInput,
  formatCurrency,
  formatCurrencyForChart,
  formatForExport,
  formatCurrencyValue: formatCurrency
};
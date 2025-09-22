import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import InfoTooltip from './InfoTooltip';
import { formatCurrency, sanitize } from '../utils/number';

const { FiHome, FiDollarSign, FiTrendingUp, FiTrendingDown, FiBarChart, FiCreditCard } = FiIcons;

const PortfolioSummary = ({ metrics, properties, loans, transactions, settings }) => {
  const [openId, setOpenId] = useState(null);
  const refPV = useRef(null);
  const refPP = useRef(null);
  const refTI = useRef(null);
  const refTE = useRef(null);
  const refNCF = useRef(null);
  const refAL = useRef(null);

  const formatPercentage = (value) => {
    const sanitized = sanitize(value);
    if (isNaN(sanitized) || !isFinite(sanitized)) return '0.0%';
    return `${sanitized.toFixed(1)}%`;
  };

  const safeMetrics = metrics || {
    totalValue: 0,
    totalPurchasePrice: 0,
    totalIncome: 0,
    totalExpenses: 0,
    netCashFlow: 0,
    averageYield: 0,
    propertyCount: 0,
    totalLoanAmount: 0,
    totalMonthlyRepayment: 0,
    activeLoanCount: 0,
    propertiesWithLoans: 0
  };

  const safeProperties = Array.isArray(properties) ? properties : [];
  const safeLoans = Array.isArray(loans) ? loans : [];
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const currency = settings?.currency || "USD";

  // Helper functions for tooltip calculations
  const buildPortfolioValueExplain = () => {
    const propertyValues = safeProperties.map(property => ({
      address: property.address || property.name || 'Unknown Property',
      value: Number(property.current_value || property.purchase_price || 0)
    }));
    const total = propertyValues.reduce((sum, p) => sum + p.value, 0);
    return { propertyValues, total, currency };
  };

  const buildPurchasePriceExplain = () => {
    const propertyPrices = safeProperties.map(property => {
      const basePrice = Number(property.purchase_price || 0);
      const acqCosts = Array.isArray(property.acquisition_costs) ?
        property.acquisition_costs.reduce((sum, cost) => sum + Number(cost.amount || 0), 0) : 0;
      return {
        address: property.address || property.name || 'Unknown Property',
        basePrice,
        acqCosts,
        total: basePrice + acqCosts
      };
    });
    const total = propertyPrices.reduce((sum, p) => sum + p.total, 0);
    return { propertyPrices, total, currency };
  };

  const buildIncomeExplain = () => {
    const incomeTransactions = safeTransactions.filter(t =>
      t.type === 'income' && Number(t.amount || 0) > 0
    );
    const rentalIncome = incomeTransactions.filter(t =>
      t.category?.toLowerCase().includes('rent') || t.description?.toLowerCase().includes('rent')
    );
    const otherIncome = incomeTransactions.filter(t =>
      !t.category?.toLowerCase().includes('rent') && !t.description?.toLowerCase().includes('rent')
    );

    const rentalTotal = rentalIncome.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const otherTotal = otherIncome.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const total = rentalTotal + otherTotal;

    return { rentalTotal, otherTotal, total, currency };
  };

  const buildExpensesExplain = () => {
    const expenseTransactions = safeTransactions.filter(t =>
      t.type === 'expense' && Number(t.amount || 0) > 0
    );
    const categoryTotals = {};

    expenseTransactions.forEach(t => {
      const category = t.category || 'Other';
      categoryTotals[category] = (categoryTotals[category] || 0) + Number(t.amount || 0);
    });

    const total = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);
    return { categoryTotals, total, currency };
  };

  const buildNetCashFlowExplain = () => {
    const income = safeMetrics.totalIncome;
    const expenses = safeMetrics.totalExpenses;
    const netCashFlow = income - expenses;
    const averageYield = safeMetrics.averageYield;
    return { income, expenses, netCashFlow, averageYield, currency };
  };

  // FIXED: Property-specific loan breakdown with strict isolation
  const buildActiveLoansExplain = () => {
    const today = new Date();
    const activeLoans = safeLoans.filter(loan => {
      if (!loan || !loan.start_date || !loan.property_id) return false;
      const startDate = new Date(loan.start_date);
      const endDate = loan.end_date ? new Date(loan.end_date) : new Date(2099, 11, 31);
      return startDate <= today && today <= endDate;
    });

    // Group loans by property for clear separation
    const loansByProperty = {};
    activeLoans.forEach(loan => {
      const propertyId = loan.property_id;
      const property = safeProperties.find(p => p.id === propertyId);
      const propertyAddress = property?.address || property?.name || `Property ${propertyId}`;

      if (!loansByProperty[propertyId]) {
        loansByProperty[propertyId] = {
          propertyAddress,
          loans: [],
          totalOriginal: 0,
          totalCurrent: 0,
          totalMonthly: 0
        };
      }

      const originalAmount = Number(loan.amount || 0);
      const currentBalance = Number(loan.current_balance || loan.amount || 0);
      const monthlyRepayment = Number(loan.monthly_payment || 0);

      loansByProperty[propertyId].loans.push({
        id: loan.id,
        originalAmount,
        currentBalance,
        monthlyRepayment,
        interestRate: Number(loan.interest_rate || 0)
      });

      loansByProperty[propertyId].totalOriginal += originalAmount;
      loansByProperty[propertyId].totalCurrent += currentBalance;
      loansByProperty[propertyId].totalMonthly += monthlyRepayment;
    });

    // Calculate portfolio totals
    const totalOriginal = Object.values(loansByProperty).reduce((sum, prop) => sum + prop.totalOriginal, 0);
    const totalCurrent = Object.values(loansByProperty).reduce((sum, prop) => sum + prop.totalCurrent, 0);
    const totalMonthly = Object.values(loansByProperty).reduce((sum, prop) => sum + prop.totalMonthly, 0);

    return {
      loansByProperty,
      totalOriginal,
      totalCurrent,
      totalMonthly,
      currency,
      propertiesWithLoans: Object.keys(loansByProperty).length,
      totalLoans: activeLoans.length
    };
  };

  const iconStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "18px",
    height: "18px",
    marginLeft: "6px",
    borderRadius: "50%",
    color: "inherit",
    background: "transparent",
    border: "1px solid currentColor",
    fontSize: "12px",
    lineHeight: 1,
    cursor: "pointer",
  };

  // Tooltip data
  const pv = buildPortfolioValueExplain();
  const pp = buildPurchasePriceExplain();
  const ti = buildIncomeExplain();
  const te = buildExpensesExplain();
  const ncf = buildNetCashFlowExplain();
  const al = buildActiveLoansExplain();

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-start justify-between p-6">
            <div>
              <div className="flex items-center text-purple-400 text-sm mb-1">
                <SafeIcon icon={FiHome} className="w-4 h-4 mr-1" />
                <span>
                  Portfolio Value
                  <button
                    ref={refPV}
                    type="button"
                    aria-label="How is this calculated?"
                    style={iconStyle}
                    onMouseEnter={() => setOpenId("pv")}
                    onMouseLeave={() => setOpenId(null)}
                    onClick={() => setOpenId((v) => (v === "pv" ? null : "pv"))}
                  >
                    ⓘ
                  </button>
                </span>
              </div>
              <div className="text-2xl font-bold text-white">{formatCurrency(safeMetrics.totalValue)}</div>
              <div className="text-xs text-gray-400 mt-1">{safeMetrics.propertyCount} properties</div>
            </div>
            <div className="w-12 h-12 rounded-full bg-purple-900/30 flex items-center justify-center">
              <SafeIcon icon={FiHome} className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-start justify-between p-6">
            <div>
              <div className="flex items-center text-orange-400 text-sm mb-1">
                <SafeIcon icon={FiDollarSign} className="w-4 h-4 mr-1" />
                <span>
                  Purchase Price
                  <button
                    ref={refPP}
                    type="button"
                    aria-label="How is this calculated?"
                    style={iconStyle}
                    onMouseEnter={() => setOpenId("pp")}
                    onMouseLeave={() => setOpenId(null)}
                    onClick={() => setOpenId((v) => (v === "pp" ? null : "pp"))}
                  >
                    ⓘ
                  </button>
                </span>
              </div>
              <div className="text-2xl font-bold text-white">{formatCurrency(safeMetrics.totalPurchasePrice)}</div>
              <div className="text-xs text-gray-400 mt-1">Total invested</div>
            </div>
            <div className="w-12 h-12 rounded-full bg-orange-900/30 flex items-center justify-center">
              <SafeIcon icon={FiDollarSign} className="w-6 h-6 text-orange-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-start justify-between p-6">
            <div>
              <div className="flex items-center text-green-400 text-sm mb-1">
                <SafeIcon icon={FiTrendingUp} className="w-4 h-4 mr-1" />
                <span>
                  Total Income
                  <button
                    ref={refTI}
                    type="button"
                    aria-label="How is this calculated?"
                    style={iconStyle}
                    onMouseEnter={() => setOpenId("ti")}
                    onMouseLeave={() => setOpenId(null)}
                    onClick={() => setOpenId((v) => (v === "ti" ? null : "ti"))}
                  >
                    ⓘ
                  </button>
                </span>
              </div>
              <div className="text-2xl font-bold text-white">{formatCurrency(safeMetrics.totalIncome)}</div>
              <div className="text-xs text-gray-400 mt-1">This financial year</div>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-900/30 flex items-center justify-center">
              <SafeIcon icon={FiTrendingUp} className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="flex items-start justify-between p-6">
            <div>
              <div className="flex items-center text-red-400 text-sm mb-1">
                <SafeIcon icon={FiTrendingDown} className="w-4 h-4 mr-1" />
                <span>
                  Total Expenses
                  <button
                    ref={refTE}
                    type="button"
                    aria-label="How is this calculated?"
                    style={iconStyle}
                    onMouseEnter={() => setOpenId("te")}
                    onMouseLeave={() => setOpenId(null)}
                    onClick={() => setOpenId((v) => (v === "te" ? null : "te"))}
                  >
                    ⓘ
                  </button>
                </span>
              </div>
              <div className="text-2xl font-bold text-white">{formatCurrency(safeMetrics.totalExpenses)}</div>
              <div className="text-xs text-gray-400 mt-1">This financial year</div>
            </div>
            <div className="w-12 h-12 rounded-full bg-red-900/30 flex items-center justify-center">
              <SafeIcon icon={FiTrendingDown} className="w-6 h-6 text-red-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-start justify-between p-6">
            <div>
              <div className="flex items-center text-blue-400 text-sm mb-1">
                <SafeIcon icon={FiBarChart} className="w-4 h-4 mr-1" />
                <span>
                  Net Cash Flow
                  <button
                    ref={refNCF}
                    type="button"
                    aria-label="How is this calculated?"
                    style={iconStyle}
                    onMouseEnter={() => setOpenId("ncf")}
                    onMouseLeave={() => setOpenId(null)}
                    onClick={() => setOpenId((v) => (v === "ncf" ? null : "ncf"))}
                  >
                    ⓘ
                  </button>
                </span>
              </div>
              <div className={`text-2xl font-bold ${sanitize(safeMetrics.netCashFlow) >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                {formatCurrency(safeMetrics.netCashFlow)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Avg Yield: {formatPercentage(safeMetrics.averageYield)}
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-900/30 flex items-center justify-center">
              <SafeIcon icon={FiBarChart} className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="flex items-start justify-between p-6">
            <div>
              <div className="flex items-center text-cyan-400 text-sm mb-1">
                <SafeIcon icon={FiCreditCard} className="w-4 h-4 mr-1" />
                <span>
                  Active Loans
                  <button
                    ref={refAL}
                    type="button"
                    aria-label="How is this calculated?"
                    style={iconStyle}
                    onMouseEnter={() => setOpenId("al")}
                    onMouseLeave={() => setOpenId(null)}
                    onClick={() => setOpenId((v) => (v === "al" ? null : "al"))}
                  >
                    ⓘ
                  </button>
                </span>
              </div>
              <div className="text-2xl font-bold text-white">{formatCurrency(safeMetrics.totalLoanAmount)}</div>
              <div className="text-xs text-gray-400 mt-1">
                {safeMetrics.activeLoanCount} loans • {safeMetrics.propertiesWithLoans || 0} properties • {formatCurrency(safeMetrics.totalMonthlyRepayment)}/mo
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-cyan-900/30 flex items-center justify-center">
              <SafeIcon icon={FiCreditCard} className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tooltips */}
      <InfoTooltip
        anchorEl={refPV.current}
        open={openId === "pv"}
        onClose={() => setOpenId(null)}
      >
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Portfolio Value</div>
        <div>
          {pv.propertyValues.map((property, index) => (
            <div key={index} style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span>{property.address}</span>
              <span>{formatCurrency(property.value, currency)}</span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
            <span>Total Portfolio Value</span>
            <span>{formatCurrency(pv.total, currency)}</span>
          </div>
          <div style={{ opacity: 0.7, marginTop: 6, fontSize: 11 }}>Sum of all property current values</div>
        </div>
      </InfoTooltip>

      <InfoTooltip
        anchorEl={refPP.current}
        open={openId === "pp"}
        onClose={() => setOpenId(null)}
      >
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Total Purchase Price</div>
        <div>
          {pp.propertyPrices.map((property, index) => (
            <div key={index} style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 500, marginBottom: 2 }}>{property.address}</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, paddingLeft: 10 }}>
                <span>Base price</span>
                <span>{formatCurrency(property.basePrice, currency)}</span>
              </div>
              {property.acqCosts > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, paddingLeft: 10 }}>
                  <span>Acquisition costs</span>
                  <span>{formatCurrency(property.acqCosts, currency)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, paddingLeft: 10, fontWeight: 500 }}>
                <span>Subtotal</span>
                <span>{formatCurrency(property.total, currency)}</span>
              </div>
            </div>
          ))}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
            <span>Total Purchase Price</span>
            <span>{formatCurrency(pp.total, currency)}</span>
          </div>
          <div style={{ opacity: 0.7, marginTop: 6, fontSize: 11 }}>Sum of all property purchase prices + acquisition costs</div>
        </div>
      </InfoTooltip>

      <InfoTooltip
        anchorEl={refTI.current}
        open={openId === "ti"}
        onClose={() => setOpenId(null)}
      >
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Total Income</div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Rental income</span>
            <span>{formatCurrency(ti.rentalTotal, currency)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Other income</span>
            <span>{formatCurrency(ti.otherTotal, currency)}</span>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
            <span>Total Income</span>
            <span>{formatCurrency(ti.total, currency)}</span>
          </div>
          <div style={{ opacity: 0.7, marginTop: 6, fontSize: 11 }}>All income transactions for the selected financial year</div>
        </div>
      </InfoTooltip>

      <InfoTooltip
        anchorEl={refTE.current}
        open={openId === "te"}
        onClose={() => setOpenId(null)}
      >
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Total Expenses</div>
        <div>
          {Object.entries(te.categoryTotals).map(([category, amount]) => (
            <div key={category} style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{category}</span>
              <span>{formatCurrency(amount, currency)}</span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
            <span>Total Expenses</span>
            <span>{formatCurrency(te.total, currency)}</span>
          </div>
          <div style={{ opacity: 0.7, marginTop: 6, fontSize: 11 }}>All expense transactions for the selected financial year</div>
        </div>
      </InfoTooltip>

      <InfoTooltip
        anchorEl={refNCF.current}
        open={openId === "ncf"}
        onClose={() => setOpenId(null)}
      >
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Net Cash Flow</div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Total income</span>
            <span style={{ color: "#10B981" }}>{formatCurrency(ncf.income, currency)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Total expenses</span>
            <span style={{ color: "#EF4444" }}>-{formatCurrency(ncf.expenses, currency)}</span>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
            <span>Net Cash Flow</span>
            <span style={{ color: ncf.netCashFlow >= 0 ? "#10B981" : "#EF4444" }}>
              {formatCurrency(ncf.netCashFlow, currency)}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span>Average yield</span>
            <span>{ncf.averageYield.toFixed(2)}%</span>
          </div>
          <div style={{ opacity: 0.7, marginTop: 6, fontSize: 11 }}>Income - Expenses for the selected financial year</div>
        </div>
      </InfoTooltip>

      <InfoTooltip
        anchorEl={refAL.current}
        open={openId === "al"}
        onClose={() => setOpenId(null)}
      >
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Active Loans by Property</div>
        <div>
          {Object.entries(al.loansByProperty).map(([propertyId, propertyInfo]) => (
            <div key={propertyId} style={{ marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ fontWeight: 600, marginBottom: 4, color: "#60A5FA" }}>{propertyInfo.propertyAddress}</div>
              {propertyInfo.loans.map((loan, loanIndex) => (
                <div key={loanIndex} style={{ marginBottom: 6, paddingLeft: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span>Original amount</span>
                    <span>{formatCurrency(loan.originalAmount, currency)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span>Current balance</span>
                    <span>{formatCurrency(loan.currentBalance, currency)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span>Monthly payment</span>
                    <span>{formatCurrency(loan.monthlyRepayment, currency)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span>Interest rate</span>
                    <span>{loan.interestRate.toFixed(2)}%</span>
                  </div>
                </div>
              ))}
              <div style={{ paddingLeft: 12, fontSize: 12, fontWeight: 500, marginTop: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Property Total</span>
                  <span>{formatCurrency(propertyInfo.totalCurrent, currency)}</span>
                </div>
              </div>
            </div>
          ))}

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", marginTop: 8, paddingTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, marginBottom: 4 }}>
              <span>Portfolio Total Outstanding</span>
              <span>{formatCurrency(al.totalCurrent, currency)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span>Total Monthly Payments</span>
              <span>{formatCurrency(al.totalMonthly, currency)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
              <span>{al.totalLoans} loans across {al.propertiesWithLoans} properties</span>
            </div>
          </div>
          <div style={{ opacity: 0.7, marginTop: 6, fontSize: 11 }}>Each property's loans are isolated and calculated separately</div>
        </div>
      </InfoTooltip>
    </>
  );
};

export default PortfolioSummary;
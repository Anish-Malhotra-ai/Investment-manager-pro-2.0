import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import * as FiIcons from "react-icons/fi";
import SafeIcon from "../common/SafeIcon";
import PortfolioSummary from "./PortfolioSummary";
import PropertyCard from "./PropertyCard";
import AddPropertyModal from "./AddPropertyModal";
import { calculatePortfolioMetrics } from "../utils/FinancialCalculations";
import {
  formatCurrency,
  sanitize,
  formatCurrencyForChart,
} from "../utils/number";
import { canUserPerformActions } from "../utils/AuthUtils";
import DataManager from "../services/DataManager";
import html2canvas from "html2canvas";

const {
  FiPlus,
  FiCamera,
  FiSave,
  FiBarChart3,
  FiDownload,
  FiPieChart,
  FiBell,
  FiClock,
  FiActivity,
  FiTrendingUp,
  FiTrendingDown,
  FiCalendar,
  FiTarget,
  FiDollarSign,
} = FiIcons;

const Dashboard = ({
  user,
  properties,
  loans,
  transactions,
  settings,
  onSaveData,
}) => {
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Check if user can perform actions (create/edit/delete)
  const canPerformActions = canUserPerformActions(user);

  // FIXED: Ensure all props are safe arrays to prevent crashes
  const safeProperties = Array.isArray(properties) ? properties : [];
  const safeLoans = Array.isArray(loans) ? loans : [];
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeSettings = settings || { financialYearStart: "07-01" };

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => currentYear - 3 + i); // 2021-2027
  }, []);

  // FIXED: Use safe arrays for portfolio metrics calculation
  const portfolioMetrics = useMemo(() => {
    return calculatePortfolioMetrics(
      safeProperties,
      safeLoans,
      safeTransactions,
      selectedYear,
      safeSettings
    );
  }, [safeProperties, safeLoans, safeTransactions, selectedYear, safeSettings]);

  // Get reminders due in next 30 days
  const upcomingReminders = useMemo(() => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    );
    const reminders = [];

    // Check transaction reminders
    safeTransactions.forEach((transaction) => {
      if (transaction.reminderDate) {
        const reminderDate = new Date(transaction.reminderDate);
        if (reminderDate >= now && reminderDate <= thirtyDaysFromNow) {
          reminders.push({
            id: transaction.id,
            type: "transaction",
            title: transaction.description,
            subtitle: `${transaction.category} - ${formatCurrency(
              transaction.amount
            )}`,
            date: reminderDate,
            data: transaction,
          });
        }
      }
    });

    // Check rental reminders
    safeProperties.forEach((property) => {
      if (property.rentals) {
        property.rentals.forEach((rental) => {
          if (rental.reminderDate) {
            const reminderDate = new Date(rental.reminderDate);
            if (reminderDate >= now && reminderDate <= thirtyDaysFromNow) {
              reminders.push({
                id: rental.id,
                type: "rental",
                title: `Rental: ${rental.tenantName}`,
                subtitle: `${property.address} - ${formatCurrency(
                  rental.amount
                )} ${rental.frequency}`,
                date: reminderDate,
                data: rental,
                propertyId: property.id,
              });
            }
          }
        });
      }
    });

    return reminders.sort((a, b) => a.date - b.date);
  }, [safeTransactions, safeProperties]);

  // Transaction statistics calculations
  const transactionStats = useMemo(() => {
    const currentYear = selectedYear;
    const yearStart = new Date(currentYear, 6, 1); // July 1st
    const yearEnd = new Date(currentYear + 1, 5, 30); // June 30th next year

    // Filter transactions for selected financial year
    const yearTransactions = safeTransactions.filter((t) => {
      if (!t.date) return false;
      const transactionDate = new Date(t.date);
      return transactionDate >= yearStart && transactionDate <= yearEnd;
    });

    // Basic transaction counts
    const totalTransactions = yearTransactions.length;
    const incomeTransactions = yearTransactions.filter(
      (t) => t.type === "income"
    ).length;
    const expenseTransactions = yearTransactions.filter(
      (t) => t.type === "expense"
    ).length;

    // Category breakdown for expenses
    const expenseCategories = {};
    yearTransactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const category = t.category || "Other";
        expenseCategories[category] =
          (expenseCategories[category] || 0) + sanitize(t.amount);
      });

    // Top expense categories (top 5)
    const topExpenseCategories = Object.entries(expenseCategories)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // Income sources breakdown
    const incomeCategories = {};
    yearTransactions
      .filter((t) => t.type === "income")
      .forEach((t) => {
        const category = t.category || "Other";
        incomeCategories[category] =
          (incomeCategories[category] || 0) + sanitize(t.amount);
      });

    // Monthly transaction patterns
    const monthlyData = {};
    for (let i = 0; i < 12; i++) {
      const month = new Date(
        yearStart.getFullYear(),
        yearStart.getMonth() + i,
        1
      );
      const monthKey = month.toISOString().slice(0, 7); // YYYY-MM format
      monthlyData[monthKey] = {
        income: 0,
        expenses: 0,
        count: 0,
      };
    }

    yearTransactions.forEach((t) => {
      if (!t.date) return;
      const monthKey = t.date.slice(0, 7);
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].count++;
        if (t.type === "income") {
          monthlyData[monthKey].income += sanitize(t.amount);
        } else if (t.type === "expense") {
          monthlyData[monthKey].expenses += sanitize(t.amount);
        }
      }
    });

    // Calculate averages
    const monthsWithData = Object.values(monthlyData).filter(
      (m) => m.count > 0
    ).length;
    const avgMonthlyTransactions =
      monthsWithData > 0 ? totalTransactions / monthsWithData : 0;
    const avgMonthlyIncome =
      monthsWithData > 0
        ? Object.values(monthlyData).reduce((sum, m) => sum + m.income, 0) /
          monthsWithData
        : 0;
    const avgMonthlyExpenses =
      monthsWithData > 0
        ? Object.values(monthlyData).reduce((sum, m) => sum + m.expenses, 0) /
          monthsWithData
        : 0;

    // Property activity analysis
    const propertyActivity = {};
    yearTransactions.forEach((t) => {
      const propId = t.propertyId || t.property_id;
      if (propId) {
        propertyActivity[propId] = (propertyActivity[propId] || 0) + 1;
      }
    });

    const mostActiveProperty = Object.entries(propertyActivity).sort(
      ([, a], [, b]) => b - a
    )[0];

    // Recent transactions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentTransactions = safeTransactions
      .filter((t) => t.date && new Date(t.date) >= thirtyDaysAgo)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    return {
      totalTransactions,
      incomeTransactions,
      expenseTransactions,
      topExpenseCategories,
      incomeCategories: Object.entries(incomeCategories).sort(
        ([, a], [, b]) => b - a
      ),
      avgMonthlyTransactions: Math.round(avgMonthlyTransactions),
      avgMonthlyIncome,
      avgMonthlyExpenses,
      mostActiveProperty: mostActiveProperty
        ? {
            propertyId: mostActiveProperty[0],
            count: mostActiveProperty[1],
            property: safeProperties.find(
              (p) => p.id === mostActiveProperty[0]
            ),
          }
        : null,
      recentTransactions,
      monthlyData,
    };
  }, [safeTransactions, safeProperties, selectedYear]);

  // Chart data for income vs expenses
  const chartData = useMemo(() => {
    const data = [];
    years.forEach((year) => {
      const metrics = calculatePortfolioMetrics(
        safeProperties,
        safeLoans,
        safeTransactions,
        year,
        safeSettings
      );
      data.push({
        year,
        income: metrics.totalIncome,
        expenses: metrics.totalExpenses,
        net: metrics.netIncome,
      });
    });
    return data;
  }, [safeProperties, safeLoans, safeTransactions, years, safeSettings]);

  const handleAddProperty = async (propertyData) => {
    try {
      // Import createProperty from DataUtils
      const { createProperty } = await import("../utils/DataUtils");

      // Create property in PocketBase
      const result = await createProperty(propertyData);

      if (!result.success) {
        console.error("Failed to create property:", result.error);
        alert(`Failed to add property: ${result.error}`);
        return;
      }

      // Trigger data refresh by reloading user data
      const { loadUserData } = await import("../utils/DataUtils");
      await loadUserData((newData) => {
        onSaveData(newData, "Property added successfully");
      });
    } catch (error) {
      console.error("Failed to add property:", error);
      alert("Failed to add property. Please try again.");
    }
  };

  const handlePropertyClick = (propertyId) => {
    navigate(`/property/${propertyId}`);
  };

  const handleReminderClick = (reminder) => {
    if (reminder.type === "rental" && reminder.propertyId) {
      navigate(`/property/${reminder.propertyId}?tab=rentals`);
    } else if (reminder.type === "transaction") {
      console.log("Transaction reminder clicked:", reminder);
    }
  };

  const handleManualBackup = async () => {
    try {
      const filename = DataManager.generateBackupFilename();
      const result = await DataManager.exportBackup(filename);

      if (result.success) {
        localStorage.setItem("lastManualBackup", new Date().toISOString());
      }
    } catch (error) {
      console.error("Manual backup failed:", error);
      alert("Backup failed. Please try again.");
    }
  };

  const handleScreenshot = async () => {
    try {
      const dashboardElement = document.getElementById("dashboard-content");
      if (!dashboardElement) {
        throw new Error("Dashboard element not found");
      }

      const canvas = await html2canvas(dashboardElement, {
        backgroundColor: "#111827",
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const link = document.createElement("a");
      link.download = `InvestmentPropertyManagerPro_snapshot_${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:.]/g, "")}.png`;
      link.href = canvas.toDataURL();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Screenshot failed:", error);
      alert("Screenshot failed. Please try again.");
    }
  };

  const handleExportTransactions = async () => {
    try {
      const result = await DataManager.exportAll("csv");
      if (result.success) {
        alert("Transactions exported successfully!");
      }
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Please try again.");
    }
  };

  // Enhanced SVG Chart Component
  const IncomeExpenseChart = ({ data }) => {
    if (!Array.isArray(data) || data.length === 0) {
      return (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center">
            <SafeIcon
              icon={FiBarChart3}
              className="w-6 h-6 mr-3 text-green-400"
            />
            Income vs Expenses by Year
          </h3>
          <div className="text-center text-gray-400 py-16">
            <SafeIcon
              icon={FiBarChart3}
              className="w-16 h-16 mx-auto mb-4 text-gray-600"
            />
            <p className="text-lg">No financial data available</p>
            <p className="text-sm mt-2">
              Add properties and transactions to see charts
            </p>
          </div>
        </div>
      );
    }

    const maxValue = Math.max(
      ...data.map((d) => Math.max((d.income), (d.expenses)))
    );
    const chartHeight = 320;
    const chartWidth = 600;
    const barWidth = 40;
    const groupWidth = 80;
    const leftMargin = 120;
    const bottomMargin = 60;

    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <SafeIcon
            icon={FiBarChart3}
            className="w-6 h-6 mr-3 text-green-400"
          />
          Income vs Expenses by Year
        </h3>
        <div className="overflow-x-auto bg-gray-900 rounded-lg p-4">
          <svg
            width={chartWidth + leftMargin}
            height={chartHeight + bottomMargin}
            className="mx-auto"
          >
            {/* Grid lines with FULL currency formatting */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
              <g key={index}>
                <line
                  x1={leftMargin}
                  y1={chartHeight * (1 - ratio) + 20}
                  x2={chartWidth + leftMargin}
                  y2={chartHeight * (1 - ratio) + 20}
                  stroke="#374151"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
                <text
                  x={leftMargin - 10}
                  y={chartHeight * (1 - ratio) + 25}
                  textAnchor="end"
                  fill="#D1D5DB"
                  fontSize="10"
                  fontWeight="bold"
                >
                  {formatCurrencyForChart(maxValue * ratio)}
                </text>
              </g>
            ))}

            {data.map((item, index) => {
              if (!item) return null;

              const x = index * groupWidth + leftMargin + 20;
              const income = sanitize(item.income);
              const expenses = sanitize(item.expenses);
              const incomeHeight =
                maxValue > 0 ? (income / maxValue) * chartHeight : 0;
              const expenseHeight =
                maxValue > 0 ? (expenses / maxValue) * chartHeight : 0;

              return (
                <g key={item.year || index}>
                  {/* Income bar */}
                  <rect
                    x={x}
                    y={chartHeight - incomeHeight + 20}
                    width={barWidth}
                    height={incomeHeight}
                    fill="#10B981"
                    opacity="0.9"
                    rx="2"
                  />
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight - incomeHeight + 10}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="8"
                    fontWeight="bold"
                  >
                    {income > 0 ? formatCurrency(income) : ""}
                  </text>

                  {/* Expense bar */}
                  <rect
                    x={x + barWidth + 8}
                    y={chartHeight - expenseHeight + 20}
                    width={barWidth}
                    height={expenseHeight}
                    fill="#EF4444"
                    opacity="0.9"
                    rx="2"
                  />
                  <text
                    x={x + barWidth + 8 + barWidth / 2}
                    y={chartHeight - expenseHeight + 10}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="8"
                    fontWeight="bold"
                  >
                    {expenses > 0 ? formatCurrency(expenses) : ""}
                  </text>

                  {/* Year label */}
                  <text
                    x={x + barWidth + 4}
                    y={chartHeight + 45}
                    textAnchor="middle"
                    fill="#F3F4F6"
                    fontSize="14"
                    fontWeight="bold"
                  >
                    {item.year || ""}
                  </text>
                </g>
              );
            })}

            {/* Enhanced Legend */}
            <g transform="translate(120, 10)">
              <rect
                x="0"
                y="0"
                width="180"
                height="40"
                fill="#1F2937"
                rx="8"
                opacity="0.8"
              />
              <rect
                x="15"
                y="12"
                width="16"
                height="16"
                fill="#10B981"
                opacity="0.9"
                rx="2"
              />
              <text
                x="38"
                y="24"
                fill="#F3F4F6"
                fontSize="14"
                fontWeight="bold"
              >
                Income
              </text>
              <rect
                x="95"
                y="12"
                width="16"
                height="16"
                fill="#EF4444"
                opacity="0.9"
                rx="2"
              />
              <text
                x="118"
                y="24"
                fill="#F3F4F6"
                fontSize="14"
                fontWeight="bold"
              >
                Expenses
              </text>
            </g>

            <text
              x={(chartWidth + leftMargin) / 2}
              y={chartHeight + bottomMargin - 5}
              textAnchor="middle"
              fill="#9CA3AF"
              fontSize="12"
              fontWeight="bold"
            >
              Financial Year
            </text>
          </svg>
        </div>
      </div>
    );
  };

  // Enhanced Portfolio Distribution Chart
  const PortfolioDistributionChart = ({ properties, totalValue }) => {
    if (!Array.isArray(properties) || properties.length === 0) {
      return (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center">
            <SafeIcon
              icon={FiPieChart}
              className="w-6 h-6 mr-3 text-purple-400"
            />
            Portfolio Value Distribution
          </h3>
          <div className="text-center text-gray-400 py-16">
            <SafeIcon
              icon={FiPieChart}
              className="w-16 h-16 mx-auto mb-4 text-gray-600"
            />
            <p className="text-lg">No properties to display</p>
            <p className="text-sm mt-2">Add properties to see distribution</p>
          </div>
        </div>
      );
    }

    const colors = [
      "#8B5CF6",
      "#06B6D4",
      "#10B981",
      "#F59E0B",
      "#EF4444",
      "#EC4899",
      "#6366F1",
    ];
    const centerX = 160;
    const centerY = 160;
    const radius = 120;
    const innerRadius = 60;

    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <SafeIcon
            icon={FiPieChart}
            className="w-6 h-6 mr-3 text-purple-400"
          />
          Portfolio Value Distribution
        </h3>
        <div className="flex flex-col lg:flex-row items-center justify-center bg-gray-900 rounded-lg p-4">
          <div className="relative">
            <svg width="320" height="320" viewBox="0 0 320 320">
              <circle
                cx={centerX}
                cy={centerY}
                r={radius + 5}
                fill="#374151"
                opacity="0.3"
              />

              {properties.map((property, index) => {
                if (!property) return null;

                const value = property.current_value || 0;
                const percentage =
                  totalValue > 0 ? (value / totalValue) * 100 : 0;
                const angle = (percentage / 100) * 360;
                const startAngle = properties
                  .slice(0, index)
                  .reduce((sum, p) => {
                    if (!p) return sum;
                    const pValue = p.current_value || 0;
                    return (
                      sum + (totalValue > 0 ? (pValue / totalValue) * 360 : 0)
                    );
                  }, 0);

                const startRad = ((startAngle - 90) * Math.PI) / 180;
                const endRad = ((startAngle + angle - 90) * Math.PI) / 180;

                const x1 = centerX + radius * Math.cos(startRad);
                const y1 = centerY + radius * Math.sin(startRad);
                const x2 = centerX + radius * Math.cos(endRad);
                const y2 = centerY + radius * Math.sin(endRad);

                const x3 = centerX + innerRadius * Math.cos(endRad);
                const y3 = centerY + innerRadius * Math.sin(endRad);
                const x4 = centerX + innerRadius * Math.cos(startRad);
                const y4 = centerY + innerRadius * Math.sin(startRad);

                const largeArcFlag = angle > 180 ? 1 : 0;
                const color = colors[index % colors.length];

                return (
                  <g key={property.id}>
                    <path
                      d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4} Z`}
                      fill={color}
                      opacity="0.9"
                      stroke="#1F2937"
                      strokeWidth="2"
                    />
                    {percentage > 5 && (
                      <text
                        x={
                          centerX +
                          (radius - 20) *
                            Math.cos(
                              ((startAngle + angle / 2 - 90) * Math.PI) / 180
                            )
                        }
                        y={
                          centerY +
                          (radius - 20) *
                            Math.sin(
                              ((startAngle + angle / 2 - 90) * Math.PI) / 180
                            )
                        }
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="12"
                        fontWeight="bold"
                      >
                        {percentage.toFixed(0)}%
                      </text>
                    )}
                  </g>
                );
              })}

              <circle
                cx={centerX}
                cy={centerY}
                r={innerRadius}
                fill="#111827"
                stroke="#374151"
                strokeWidth="2"
              />
              <text
                x={centerX}
                y={centerY - 10}
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="14"
                fontWeight="bold"
              >
                Total Value
              </text>
              <text
                x={centerX}
                y={centerY + 10}
                textAnchor="middle"
                fill="#10B981"
                fontSize="12"
                fontWeight="bold"
              >
                {formatCurrency(totalValue)}
              </text>
            </svg>
          </div>

          {/* Enhanced Legend shows full currency amounts */}
          <div className="mt-6 lg:mt-0 lg:ml-8 space-y-3 max-w-xs">
            {properties.map((property, index) => {
              if (!property) return null;

              const color = colors[index % colors.length];
              const value = property.current_value || 0;
              const percentage =
                totalValue > 0 ? (value / totalValue) * 100 : 0;

              return (
                <div
                  key={property.id}
                  className="flex items-center justify-between p-2 bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full border-2 border-gray-300"
                      style={{ backgroundColor: color }}
                    ></div>
                    <div>
                      <span className="text-white font-medium text-sm">
                        {property.address}
                      </span>
                      <div className="text-gray-400 text-xs">
                        {formatCurrency(value)}
                      </div>
                    </div>
                  </div>
                  <span className="text-white font-bold text-sm">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div id="dashboard-content" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">
            Overview of your investment portfolio
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="form-select text-sm"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                FY {year}-{(year + 1).toString().slice(-2)}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExportTransactions}
              className="btn-secondary flex items-center space-x-2 text-sm"
              title="Export transactions"
            >
              <SafeIcon icon={FiDownload} className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>

            {canPerformActions && (
              <button
                onClick={handleScreenshot}
                className="btn-secondary flex items-center space-x-2 text-sm"
                title="Take screenshot"
              >
                <SafeIcon icon={FiCamera} className="w-4 h-4" />
                <span className="hidden sm:inline">Screenshot</span>
              </button>
            )}

            {canPerformActions && (
              <button
                onClick={handleManualBackup}
                className="btn-secondary flex items-center space-x-2 text-sm"
                title="Manual backup"
              >
                <SafeIcon icon={FiSave} className="w-4 h-4" />
                <span className="hidden sm:inline">Backup</span>
              </button>
            )}

            {canPerformActions && (
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <SafeIcon icon={FiPlus} className="w-5 h-5" />
                <span>Add Property</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reminders Panel */}
      {upcomingReminders.length > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
          <h3 className="text-yellow-400 font-medium mb-3 flex items-center">
            <SafeIcon icon={FiBell} className="w-5 h-5 mr-2" />
            Reminders Due in Next 30 Days ({upcomingReminders.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcomingReminders.slice(0, 6).map((reminder) => (
              <div
                key={`${reminder.type}-${reminder.id}`}
                onClick={() => handleReminderClick(reminder)}
                className="bg-gray-800/50 rounded-lg p-3 cursor-pointer hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-white font-medium text-sm">
                      {reminder.title}
                    </h4>
                    <p className="text-gray-400 text-xs mt-1">
                      {reminder.subtitle}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-yellow-400 text-xs flex items-center">
                      <SafeIcon icon={FiClock} className="w-3 h-3 mr-1" />
                      {reminder.date.toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {upcomingReminders.length > 6 && (
            <p className="text-yellow-300 text-sm mt-3">
              And {upcomingReminders.length - 6} more reminders...
            </p>
          )}
        </div>
      )}

      {/* Portfolio Summary with Tooltips */}
      <PortfolioSummary
        metrics={portfolioMetrics}
        properties={safeProperties}
        loans={safeLoans}
        transactions={safeTransactions}
        settings={safeSettings}
      />

      {/* Transaction Statistics */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <SafeIcon icon={FiActivity} className="w-6 h-6 mr-3 text-blue-400" />
          Transaction Analytics - FY {selectedYear}-
          {(selectedYear + 1).toString().slice(-2)}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Transaction Volume */}
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-300">
                Total Transactions
              </h4>
              <SafeIcon icon={FiActivity} className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {transactionStats.totalTransactions}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {transactionStats.incomeTransactions} income •{" "}
              {transactionStats.expenseTransactions} expenses
            </div>
          </div>

          {/* Monthly Average */}
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-300">
                Monthly Average
              </h4>
              <SafeIcon icon={FiCalendar} className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {transactionStats.avgMonthlyTransactions}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              transactions per month
            </div>
          </div>

          {/* Average Monthly Income */}
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-300">
                Avg Monthly Income
              </h4>
              <SafeIcon
                icon={FiTrendingUp}
                className="w-4 h-4 text-green-400"
              />
            </div>
            <div className="text-2xl font-bold text-green-400">
              {formatCurrency(transactionStats.avgMonthlyIncome)}
            </div>
            <div className="text-xs text-gray-400 mt-1">per month</div>
          </div>

          {/* Average Monthly Expenses */}
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-300">
                Avg Monthly Expenses
              </h4>
              <SafeIcon
                icon={FiTrendingDown}
                className="w-4 h-4 text-red-400"
              />
            </div>
            <div className="text-2xl font-bold text-red-400">
              {formatCurrency(transactionStats.avgMonthlyExpenses)}
            </div>
            <div className="text-xs text-gray-400 mt-1">per month</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Expense Categories */}
          <div className="bg-gray-900/50 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
              <SafeIcon icon={FiTarget} className="w-5 h-5 mr-2 text-red-400" />
              Top Expense Categories
            </h4>
            {transactionStats.topExpenseCategories.length > 0 ? (
              <div className="space-y-3">
                {transactionStats.topExpenseCategories.map(
                  ([category, amount], index) => (
                    <div
                      key={category}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-red-400 rounded-full mr-3"></div>
                        <span className="text-sm text-gray-300">
                          {category}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-white">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  )
                )}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No expense data available</p>
            )}
          </div>

          {/* Income Sources */}
          <div className="bg-gray-900/50 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
              <SafeIcon
                icon={FiDollarSign}
                className="w-5 h-5 mr-2 text-green-400"
              />
              Income Sources
            </h4>
            {transactionStats.incomeCategories.length > 0 ? (
              <div className="space-y-3">
                {transactionStats.incomeCategories
                  .slice(0, 5)
                  .map(([category, amount], index) => (
                    <div
                      key={category}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                        <span className="text-sm text-gray-300">
                          {category}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-white">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No income data available</p>
            )}
          </div>

          {/* Recent Activity & Most Active Property */}
          <div className="bg-gray-900/50 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
              <SafeIcon
                icon={FiClock}
                className="w-5 h-5 mr-2 text-purple-400"
              />
              Recent Activity
            </h4>

            {/* Most Active Property */}
            {transactionStats.mostActiveProperty && (
              <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
                <div className="text-xs text-gray-400 mb-1">
                  Most Active Property
                </div>
                <div className="text-sm font-medium text-white">
                  {transactionStats.mostActiveProperty.property?.address ||
                    "Unknown Property"}
                </div>
                <div className="text-xs text-purple-400">
                  {transactionStats.mostActiveProperty.count} transactions
                </div>
              </div>
            )}

            {/* Recent Transactions */}
            <div className="space-y-2">
              <div className="text-xs text-gray-400 mb-2">Last 30 Days</div>
              {transactionStats.recentTransactions.length > 0 ? (
                transactionStats.recentTransactions.map(
                  (transaction, index) => (
                    <div
                      key={transaction.id || index}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex-1 truncate">
                        <span className="text-gray-300">
                          {transaction.description || "Transaction"}
                        </span>
                      </div>
                      <div className="text-right ml-2">
                        <div
                          className={`font-medium ${
                            transaction.type === "income"
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {transaction.type === "income" ? "+" : "-"}
                          {formatCurrency(Math.abs(transaction.amount || 0))}
                        </div>
                      </div>
                    </div>
                  )
                )
              ) : (
                <p className="text-gray-400 text-xs">No recent transactions</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <IncomeExpenseChart data={chartData} />
        <PortfolioDistributionChart
          properties={safeProperties}
          totalValue={portfolioMetrics.totalValue}
        />
      </div>

      {/* Properties Grid */}
      {safeProperties.length === 0 ? (
        <div className="card text-center py-12">
          <div className="w-16 h-16 bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <SafeIcon icon={FiPlus} className="w-8 h-8 text-purple-400" />
          </div>
          <h3 className="text-xl font-medium text-gray-400 mb-2">
            No Properties Added
          </h3>
          <p className="text-gray-500 mb-6">
            {canPerformActions
              ? "Start building your investment portfolio by adding your first property"
              : "No properties available to view"}
          </p>
          {canPerformActions && (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary"
            >
              Add Your First Property
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {safeProperties.map((property) => {
            if (!property || !property.id) return null;

            return (
              <PropertyCard
                key={property.id}
                user={user}
                property={property}
                loans={safeLoans}
                transactions={safeTransactions}
                onClick={() => handlePropertyClick(property.id)}
              />
            );
          })}
        </div>
      )}

      {/* Add Property Modal */}
      {canPerformActions && (
        <AddPropertyModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={handleAddProperty}
        />
      )}
    </div>
  );
};

export default Dashboard;

import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
);

const DashboardCharts = ({ data }) => {
  if (!data) return null;

  const { users, transactions } = data;

  // User Analytics Chart Data
  const userChartData = {
    labels: Object.keys(users?.usersByCountry || {}),
    datasets: [
      {
        label: "Users by Country",
        data: Object.values(users?.usersByCountry || {}),
        backgroundColor: [
          "rgba(59, 130, 246, 0.8)",
          "rgba(16, 185, 129, 0.8)",
          "rgba(245, 158, 11, 0.8)",
          "rgba(239, 68, 68, 0.8)",
          "rgba(139, 92, 246, 0.8)",
        ],
        borderColor: [
          "rgba(59, 130, 246, 1)",
          "rgba(16, 185, 129, 1)",
          "rgba(245, 158, 11, 1)",
          "rgba(239, 68, 68, 1)",
          "rgba(139, 92, 246, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  // Transaction Types Chart Data
  const transactionChartData = {
    labels: Object.keys(transactions?.transactionsByType || {}),
    datasets: [
      {
        label: "Transactions by Type",
        data: Object.values(transactions?.transactionsByType || {}),
        backgroundColor: [
          "rgba(99, 102, 241, 0.8)",
          "rgba(34, 197, 94, 0.8)",
          "rgba(251, 191, 36, 0.8)",
          "rgba(248, 113, 113, 0.8)",
        ],
        borderColor: [
          "rgba(99, 102, 241, 1)",
          "rgba(34, 197, 94, 1)",
          "rgba(251, 191, 36, 1)",
          "rgba(248, 113, 113, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "User Distribution",
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "right",
      },
      title: {
        display: true,
        text: "Transaction Types",
      },
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* User Analytics Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Users by Country
        </h3>
        <div className="h-64">
          {users?.usersByCountry &&
          Object.keys(users.usersByCountry).length > 0 ? (
            <Bar data={userChartData} options={chartOptions} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>No user data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Transaction Types Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Transaction Types
        </h3>
        <div className="h-64">
          {transactions?.transactionsByType &&
          Object.keys(transactions.transactionsByType).length > 0 ? (
            <Doughnut data={transactionChartData} options={doughnutOptions} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>No transaction data available</p>
            </div>
          )}
        </div>
      </div>

      {/* KYC Levels Chart */}
      {users?.usersByKYCLevel &&
        Object.keys(users.usersByKYCLevel).length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:col-span-2">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Users by KYC Level
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(users.usersByKYCLevel).map(([level, count]) => (
                <div key={level} className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {count}
                  </div>
                  <div className="text-sm text-gray-500">{level}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Revenue Summary */}
      {data.revenue && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:col-span-2">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Revenue Summary
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                ${data.revenue.totalRevenue?.toLocaleString() || "0"}
              </div>
              <div className="text-sm text-gray-500">Total Revenue</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                ${data.revenue.monthlyRevenue?.toLocaleString() || "0"}
              </div>
              <div className="text-sm text-gray-500">Monthly Revenue</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {data.revenue.transactionCount?.toLocaleString() || "0"}
              </div>
              <div className="text-sm text-gray-500">Total Transactions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                ${data.revenue.averageTransaction?.toFixed(2) || "0"}
              </div>
              <div className="text-sm text-gray-500">Avg. Transaction</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardCharts;

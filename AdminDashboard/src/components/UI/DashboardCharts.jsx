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

// Apply premium font to all charts
ChartJS.defaults.font.family = "'Inter', system-ui, sans-serif";
ChartJS.defaults.color = "#94a3b8";

const BAR_COLORS = [
  "rgba(37,99,235,0.85)",
  "rgba(20,184,166,0.85)",
  "rgba(124,58,237,0.85)",
  "rgba(245,158,11,0.85)",
  "rgba(239,68,68,0.80)",
];
const DONUT_COLORS = ["#2563EB", "#14B8A6", "#7C3AED", "#F59E0B", "#EF4444"];

const TOOLTIP_STYLE = {
  backgroundColor: "#0f172a",
  titleColor: "#f8fafc",
  bodyColor: "#94a3b8",
  padding: 12,
  cornerRadius: 10,
  borderColor: "rgba(255,255,255,0.08)",
  borderWidth: 1,
};

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function MetricGrid({ items }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map(({ label, value, color }) => (
        <div key={label} className="text-center p-3 rounded-xl bg-slate-50">
          <p className={`text-xl font-bold tabular ${color}`}>{value}</p>
          <p className="text-xs text-slate-500 mt-1">{label}</p>
        </div>
      ))}
    </div>
  );
}

const DashboardCharts = ({ data }) => {
  if (!data) return null;

  const { users, transactions } = data;

  const barData = {
    labels: Object.keys(users?.usersByCountry || {}),
    datasets: [
      {
        label: "Users",
        data: Object.values(users?.usersByCountry || {}),
        backgroundColor: BAR_COLORS,
        borderColor: "transparent",
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const donutData = {
    labels: Object.keys(transactions?.transactionsByType || {}),
    datasets: [
      {
        data: Object.values(transactions?.transactionsByType || {}),
        backgroundColor: DONUT_COLORS,
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: TOOLTIP_STYLE,
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { font: { size: 11 } },
      },
      y: {
        grid: { color: "#f1f5f9", drawBorder: false },
        border: { display: false, dash: [4, 4] },
        ticks: { font: { size: 11 } },
      },
    },
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right",
        labels: {
          padding: 14,
          usePointStyle: true,
          pointStyleWidth: 8,
          font: { size: 12 },
          color: "#475569",
        },
      },
      tooltip: TOOLTIP_STYLE,
    },
    cutout: "72%",
  };

  const hasCountryData =
    users?.usersByCountry && Object.keys(users.usersByCountry).length > 0;
  const hasTypeData =
    transactions?.transactionsByType &&
    Object.keys(transactions.transactionsByType).length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <ChartCard title="Users by Country" subtitle="Geographic distribution">
        <div className="h-52">
          {hasCountryData ? (
            <Bar data={barData} options={barOptions} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              No data available
            </div>
          )}
        </div>
      </ChartCard>

      <ChartCard title="Transaction Types" subtitle="Breakdown by category">
        <div className="h-52">
          {hasTypeData ? (
            <Doughnut data={donutData} options={donutOptions} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              No data available
            </div>
          )}
        </div>
      </ChartCard>

      {users?.usersByKYCLevel &&
        Object.keys(users.usersByKYCLevel).length > 0 && (
          <ChartCard
            title="KYC Verification Levels"
            subtitle="Users by verification tier"
          >
            <MetricGrid
              items={Object.entries(users.usersByKYCLevel).map(
                ([level, count]) => ({
                  label: level,
                  value: count.toLocaleString(),
                  color: "text-slate-900",
                }),
              )}
            />
          </ChartCard>
        )}

      {data.revenue && (
        <ChartCard
          title="Revenue Summary"
          subtitle="Platform financial overview"
        >
          <MetricGrid
            items={[
              {
                label: "Total Revenue",
                value: `$${data.revenue.totalRevenue?.toLocaleString() || 0}`,
                color: "text-emerald-600",
              },
              {
                label: "Monthly Revenue",
                value: `$${data.revenue.monthlyRevenue?.toLocaleString() || 0}`,
                color: "text-blue-600",
              },
              {
                label: "Transactions",
                value: data.revenue.transactionCount?.toLocaleString() || 0,
                color: "text-violet-600",
              },
              {
                label: "Avg. Transaction",
                value: `$${data.revenue.averageTransaction?.toFixed(2) || 0}`,
                color: "text-amber-600",
              },
            ]}
          />
        </ChartCard>
      )}
    </div>
  );
};

export default DashboardCharts;

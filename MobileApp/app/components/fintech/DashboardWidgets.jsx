/* eslint-disable no-unused-vars */
import React from "react";
import { DashboardWidget } from "../layout/DashboardUtils";
import { cn } from "../../utils";
import { Button } from "../ui";

/**
 * Extensible Widget System for Financial Dashboard
 * Provides a framework for adding new widgets dynamically
 */

// Widget Registry - Add new widgets here
const WIDGET_REGISTRY = {
  "balance-overview": {
    component: BalanceOverviewWidget,
    name: "Balance Overview",
    description: "Total account balances and trends",
    category: "finance",
    defaultSize: "medium",
  },
  "quick-stats": {
    component: QuickStatsWidget,
    name: "Quick Stats",
    description: "Key financial metrics",
    category: "finance",
    defaultSize: "large",
  },
  "recent-activity": {
    component: RecentActivityWidget,
    name: "Recent Activity",
    description: "Latest transactions and updates",
    category: "activity",
    defaultSize: "medium",
  },
};

// Widget Size Configurations
const WIDGET_SIZES = {
  small: "col-span-1 row-span-1",
  medium: "col-span-1 md:col-span-2 row-span-2",
  large: "col-span-1 md:col-span-2 lg:col-span-3 row-span-2",
  wide: "col-span-full row-span-1",
};

// Balance Overview Widget
function BalanceOverviewWidget({ data, config }) {
  const { accounts = [] } = data || {};
  const totalBalance = accounts.reduce(
    (sum, acc) => sum + (acc.balance || 0),
    0
  );
  const totalChange = 2.5;

  return (
    <DashboardWidget
      title="Balance Overview"
      subtitle={`${accounts.length} accounts`}
    >
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-3xl font-bold text-neutral-900">
            ${totalBalance.toLocaleString()}
          </p>
        </div>
      </div>
    </DashboardWidget>
  );
}

// Quick Stats Widget
function QuickStatsWidget({ data }) {
  const stats = [
    {
      label: "Monthly Income",
      value: "$3,200",
      change: "+5.2%",
      positive: true,
    },
    {
      label: "Monthly Expenses",
      value: "$2,100",
      change: "-2.1%",
      positive: true,
    },
  ];

  return (
    <DashboardWidget title="Quick Stats" subtitle="Key metrics at a glance">
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="text-center p-3 bg-neutral-50 rounded-lg">
            <p className="text-lg font-bold text-neutral-900">{stat.value}</p>
            <p className="text-xs text-neutral-600 mb-1">{stat.label}</p>
          </div>
        ))}
      </div>
    </DashboardWidget>
  );
}

// Recent Activity Widget
function RecentActivityWidget({ data }) {
  const activities = [
    {
      type: "payment",
      desc: "Salary received",
      amount: "+$3,200",
      time: "2h ago",
    },
  ];

  return (
    <DashboardWidget
      title="Recent Activity"
      action={
        <Button variant="ghost" size="sm">
          View All
        </Button>
      }
    >
      <div className="space-y-3">
        {activities.map((activity, index) => (
          <div key={index} className="flex items-center justify-between py-2">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">
                ↓
              </div>
              <div>
                <p className="text-sm font-medium">{activity.desc}</p>
                <p className="text-xs text-neutral-500">{activity.time}</p>
              </div>
            </div>
            <span className="text-sm font-medium text-green-600">
              {activity.amount}
            </span>
          </div>
        ))}
      </div>
    </DashboardWidget>
  );
}

const WidgetContainer = ({ widgetId, data, config, className, ...props }) => {
  const widget = WIDGET_REGISTRY[widgetId];

  if (!widget) {
    return (
      <div
        className={cn(
          "p-4 border-2 border-dashed border-neutral-300 rounded-lg text-center text-neutral-500",
          className
        )}
      >
        Widget "{widgetId}" not found
      </div>
    );
  }

  const WidgetComponent = widget.component;
  const sizeClass = WIDGET_SIZES[config?.size || widget.defaultSize];

  return (
    <div className={cn(sizeClass, className)} {...props}>
      <WidgetComponent data={data} config={config} />
    </div>
  );
};

const DashboardWidgetGrid = ({ widgets = [], className, ...props }) => {
  return (
    <div
      className={cn(
        "grid gap-4 lg:gap-6",
        "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        "auto-rows-max",
        className
      )}
      {...props}
    >
      {widgets.map((widget, index) => (
        <WidgetContainer
          key={widget.id || index}
          widgetId={widget.type}
          data={widget.data}
          config={widget.config}
        />
      ))}
    </div>
  );
};

export {
  WIDGET_REGISTRY,
  WIDGET_SIZES,
  WidgetContainer,
  DashboardWidgetGrid,
  BalanceOverviewWidget,
  QuickStatsWidget,
  RecentActivityWidget,
};

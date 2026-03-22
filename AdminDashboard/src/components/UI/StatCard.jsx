import React from "react";
import {
  UsersIcon,
  UserIcon,
  CreditCardIcon,
  BanknotesIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@heroicons/react/24/outline";

const StatCard = ({ title, value, change, changeType, icon }) => {
  const iconMap = {
    users: UsersIcon,
    "user-check": UserIcon,
    "credit-card": CreditCardIcon,
    banknotes: BanknotesIcon,
  };

  const IconComponent = iconMap[icon] || UsersIcon;

  const getChangeColor = () => {
    switch (changeType) {
      case "positive":
        return "text-green-600";
      case "negative":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getChangeIcon = () => {
    switch (changeType) {
      case "positive":
        return <ArrowUpIcon className="h-3 w-3" />;
      case "negative":
        return <ArrowDownIcon className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {value?.toLocaleString?.() || value || "0"}
          </p>
        </div>
        <div className="flex-shrink-0">
          <div className="p-3 bg-blue-50 rounded-full">
            <IconComponent className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </div>
      {change && (
        <div className={`mt-4 flex items-center text-sm ${getChangeColor()}`}>
          {getChangeIcon()}
          <span className="ml-1">{change}</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;

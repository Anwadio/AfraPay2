import React from "react";
import { formatDistanceToNow } from "date-fns";
import {
  UserPlusIcon,
  BanknotesIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

const RecentActivity = ({ activities = [] }) => {
  const getActivityIcon = (type) => {
    switch (type) {
      case "USER_REGISTRATION":
        return <UserPlusIcon className="h-5 w-5 text-green-500" />;
      case "LARGE_TRANSACTION":
        return <BanknotesIcon className="h-5 w-5 text-blue-500" />;
      case "KYC_APPROVED":
        return <CheckBadgeIcon className="h-5 w-5 text-green-500" />;
      default:
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case "USER_REGISTRATION":
        return "bg-green-50 border-green-200";
      case "LARGE_TRANSACTION":
        return "bg-blue-50 border-blue-200";
      case "KYC_APPROVED":
        return "bg-green-50 border-green-200";
      default:
        return "bg-yellow-50 border-yellow-200";
    }
  };

  if (!activities || activities.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <ExclamationTriangleIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
        <p>No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => (
        <div
          key={activity.id || index}
          className={`border rounded-lg p-4 ${getActivityColor(activity.type)}`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0 mr-3 mt-1">
              {getActivityIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {activity.description}
              </p>
              <div className="mt-1 flex items-center text-xs text-gray-500">
                {activity.user && (
                  <span className="mr-4">User: {activity.user}</span>
                )}
                {activity.amount && (
                  <span className="mr-4">
                    Amount: {activity.currency || "$"}
                    {activity.amount?.toLocaleString()}
                  </span>
                )}
                <span>
                  {activity.timestamp
                    ? formatDistanceToNow(new Date(activity.timestamp), {
                        addSuffix: true,
                      })
                    : "Unknown time"}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}

      {activities.length === 0 && (
        <div className="text-center text-gray-500 py-4">
          <p className="text-sm">No recent activity to display</p>
        </div>
      )}
    </div>
  );
};

export default RecentActivity;

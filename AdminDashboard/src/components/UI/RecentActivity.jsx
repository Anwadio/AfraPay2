import React from "react";
import { formatDistanceToNow } from "date-fns";
import {
  UserPlusIcon,
  BanknotesIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

const ACTIVITY_CONFIG = {
  USER_REGISTRATION: {
    icon: UserPlusIcon,
    iconClass: "bg-emerald-50 text-emerald-600",
  },
  LARGE_TRANSACTION: {
    icon: BanknotesIcon,
    iconClass: "bg-blue-50 text-blue-600",
  },
  KYC_APPROVED: {
    icon: CheckBadgeIcon,
    iconClass: "bg-teal-50 text-teal-600",
  },
  default: {
    icon: ExclamationTriangleIcon,
    iconClass: "bg-amber-50 text-amber-600",
  },
};

const RecentActivity = ({ activities = [] }) => {
  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-600">No recent activity</p>
        <p className="text-xs text-slate-400 mt-1">
          New events will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {activities.map((activity, index) => {
        const config =
          ACTIVITY_CONFIG[activity.type] || ACTIVITY_CONFIG.default;
        const Icon = config.icon;
        return (
          <div
            key={activity.id || index}
            className="group flex items-start gap-3.5 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-default"
          >
            <div
              className={`flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center ${
                config.iconClass
              }`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 leading-snug">
                {activity.description}
              </p>
              <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                {activity.user && (
                  <span className="truncate max-w-[120px]">
                    {activity.user}
                  </span>
                )}
                {activity.amount && (
                  <span className="font-semibold text-slate-600">
                    {activity.currency || "$"}
                    {activity.amount?.toLocaleString()}
                  </span>
                )}
                <span className="ml-auto flex-shrink-0">
                  {activity.timestamp
                    ? formatDistanceToNow(new Date(activity.timestamp), {
                        addSuffix: true,
                      })
                    : "—"}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RecentActivity;

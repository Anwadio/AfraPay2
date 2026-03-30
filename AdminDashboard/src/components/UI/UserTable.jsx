import React from "react";
import {
  CheckCircleIcon,
  XCircleIcon,
  PencilSquareIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";

const STATUS_MAP = {
  active: { label: "Active", badge: "badge-green" },
  inactive: { label: "Inactive", badge: "badge-gray" },
  suspended: { label: "Suspended", badge: "badge-red" },
  blocked: { label: "Blocked", badge: "badge-red" },
};

const AVATAR_GRADIENTS = [
  "from-blue-500 to-blue-700",
  "from-violet-500 to-purple-700",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-600",
];

function UserAvatar({ name, email }) {
  const initials = (name || email || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const idx = (name || email || "").charCodeAt(0) % AVATAR_GRADIENTS.length;
  return (
    <div
      className={`h-8 w-8 rounded-lg bg-gradient-to-br ${
        AVATAR_GRADIENTS[idx]
      } flex items-center justify-center flex-shrink-0 shadow-sm`}
    >
      <span className="text-white text-xs font-bold">{initials}</span>
    </div>
  );
}

const UserTable = ({
  users,
  pagination,
  onPageChange,
  onUserAction,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="table-container">
        <div className="p-6 space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-8 w-8 skeleton rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 skeleton rounded w-1/4" />
                <div className="h-3 skeleton rounded w-1/3" />
              </div>
              <div className="h-5 skeleton rounded-full w-16" />
              <div className="h-4 skeleton rounded w-14" />
              <div className="h-4 skeleton rounded w-24" />
              <div className="h-8 skeleton rounded-xl w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="table-container">
      <div className="card-header">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">All Users</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {(pagination.totalItems || 0).toLocaleString()} total records
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-slate-50/60 border-b border-slate-100">
              <th className="table-header-cell">User</th>
              <th className="table-header-cell">Status</th>
              <th className="table-header-cell">Verified</th>
              <th className="table-header-cell">Joined</th>
              <th className="table-header-cell text-right pr-5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/80">
            {users.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-16 text-center">
                  <div className="text-slate-400">
                    <p className="text-sm font-medium">No users found</p>
                    <p className="text-xs mt-1">Try adjusting your filters</p>
                  </div>
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const st = STATUS_MAP[user.status] || STATUS_MAP.inactive;
                return (
                  <tr key={user.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={user.name} email={user.email} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {user.name}
                          </p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={st.badge}>{st.label}</span>
                    </td>
                    <td className="table-cell">
                      {user.emailVerified ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                          <CheckCircleIcon className="h-3.5 w-3.5" />
                          Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                          <XCircleIcon className="h-3.5 w-3.5" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="table-cell text-xs text-slate-500 tabular">
                      {new Date(
                        user.createdAt || user.$createdAt,
                      ).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => onUserAction("updateStatus", user)}
                          className="btn-ghost text-xs py-1.5 px-2.5 gap-1 text-slate-600"
                        >
                          <PencilSquareIcon className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        {!user.emailVerified && (
                          <button
                            onClick={() => onUserAction("approve", user)}
                            className="btn-ghost text-xs py-1.5 px-2.5 gap-1 text-emerald-600 hover:bg-emerald-50"
                          >
                            <CheckBadgeIcon className="h-3.5 w-3.5" />
                            Approve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="px-5 py-3 flex items-center justify-between border-t border-slate-100 bg-slate-50/40">
          <p className="text-xs text-slate-500">
            Page{" "}
            <span className="font-semibold text-slate-700">
              {pagination.page}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-700">
              {pagination.totalPages}
            </span>{" "}
            · {pagination.totalItems?.toLocaleString()} users
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserTable;

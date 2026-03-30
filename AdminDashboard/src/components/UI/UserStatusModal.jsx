import React, { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

const UserStatusModal = ({ isOpen, onClose, user, onUpdate, isLoading }) => {
  const [formData, setFormData] = useState({
    status: "",
    reason: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        status: user.status || "active",
        reason: "",
      });
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate(formData);
  };

  const statusBadge = {
    active: "badge-green",
    inactive: "badge-gray",
    suspended: "badge-red",
    blocked: "badge-red",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50"
        style={{
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white w-full max-w-[480px] rounded-2xl shadow-modal animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">
            Update User Status
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* User info card */}
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">
                {(user.name || user.email || "U").charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {user.name}
              </p>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {user.email}
              </p>
            </div>
            <span
              className={`${statusBadge[user.status] || "badge-gray"} flex-shrink-0`}
            >
              {user.status}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">New Status</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                required
                className="select"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>

            <div>
              <label className="label">
                Reason{" "}
                <span className="normal-case font-normal text-slate-400">
                  (optional)
                </span>
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                rows={3}
                placeholder="Enter reason for status change…"
                className="input resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Updating…
                  </span>
                ) : (
                  "Update Status"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserStatusModal;

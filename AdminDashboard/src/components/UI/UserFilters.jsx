import React from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

const UserFilters = ({ filters, onFilterChange }) => {
  const set = (key, value) => onFilterChange({ [key]: value });

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search users…"
            value={filters.search}
            onChange={(e) => set("search", e.target.value)}
            className="input pl-10"
          />
        </div>

        {/* Status */}
        <select
          value={filters.status}
          onChange={(e) => set("status", e.target.value)}
          className="select"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
          <option value="blocked">Blocked</option>
        </select>

        {/* Verification */}
        <select
          value={filters.verified}
          onChange={(e) => set("verified", e.target.value)}
          className="select"
        >
          <option value="">All Verification</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>

        {/* Per page */}
        <select
          value={filters.limit}
          onChange={(e) => set("limit", parseInt(e.target.value))}
          className="select"
        >
          <option value={10}>10 per page</option>
          <option value={20}>20 per page</option>
          <option value={50}>50 per page</option>
          <option value={100}>100 per page</option>
        </select>
      </div>
    </div>
  );
};

export default UserFilters;

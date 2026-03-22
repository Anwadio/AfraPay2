import React from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

const UserFilters = ({ filters, onFilterChange, isLoading }) => {
  const handleInputChange = (key, value) => {
    onFilterChange({ [key]: value });
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search users..."
            value={filters.search}
            onChange={(e) => handleInputChange("search", e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={filters.status}
            onChange={(e) => handleInputChange("status", e.target.value)}
            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>

        {/* Verification Filter */}
        <div>
          <select
            value={filters.verified}
            onChange={(e) => handleInputChange("verified", e.target.value)}
            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Verification</option>
            <option value="true">Verified</option>
            <option value="false">Unverified</option>
          </select>
        </div>

        {/* Results per page */}
        <div>
          <select
            value={filters.limit}
            onChange={(e) =>
              handleInputChange("limit", parseInt(e.target.value))
            }
            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default UserFilters;

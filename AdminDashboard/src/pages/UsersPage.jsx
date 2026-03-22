import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userAPI } from "../services/adminAPI";
import UserTable from "../components/UI/UserTable";
import UserFilters from "../components/UI/UserFilters";
import UserStatusModal from "../components/UI/UserStatusModal";
import toast from "react-hot-toast";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";

const UsersPage = () => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    status: "",
    verified: "",
    search: "",
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch users with real backend data
  const {
    data: usersData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["users", filters],
    queryFn: () => userAPI.getUsers(filters),
    keepPreviousData: true,
  });

  // Update user status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ userId, statusData }) =>
      userAPI.updateUserStatus(userId, statusData),
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
      toast.success("User status updated successfully");
      setStatusModalOpen(false);
      setSelectedUser(null);
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message || "Failed to update user status",
      );
    },
  });

  // Update verification mutation
  const updateVerificationMutation = useMutation({
    mutationFn: ({ userId, verificationData }) =>
      userAPI.updateUserVerification(userId, verificationData),
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
      toast.success("User verification updated successfully");
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message || "Failed to update user verification",
      );
    },
  });

  // Export users mutation
  const exportMutation = useMutation({
    mutationFn: (format) => userAPI.exportUsers(format),
    onSuccess: (response, format) => {
      // Create and download file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `users.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Users exported successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to export users");
    },
  });

  const handleFilterChange = (newFilters) => {
    setFilters({ ...filters, ...newFilters, page: 1 });
  };

  const handlePageChange = (page) => {
    setFilters({ ...filters, page });
  };

  const handleUserAction = (action, user) => {
    setSelectedUser(user);

    switch (action) {
      case "updateStatus":
        setStatusModalOpen(true);
        break;
      case "approve":
        updateVerificationMutation.mutate({
          userId: user.id,
          verificationData: { verified: true, reason: "Approved by admin" },
        });
        break;
      case "reject":
        updateVerificationMutation.mutate({
          userId: user.id,
          verificationData: { verified: false, reason: "Rejected by admin" },
        });
        break;
      default:
        break;
    }
  };

  const handleStatusUpdate = (statusData) => {
    if (selectedUser) {
      updateStatusMutation.mutate({
        userId: selectedUser.id,
        statusData,
      });
    }
  };

  const handleExport = (format) => {
    exportMutation.mutate(format);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-16 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-medium mb-2">Error Loading Users</h3>
        <p className="text-red-600 mb-4">{error.message}</p>
        <button
          onClick={() => refetch()}
          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const users = usersData?.data || [];
  const pagination = usersData?.meta?.pagination || usersData?.pagination || {};

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage and monitor all platform users. Total:{" "}
            {pagination.totalItems || 0}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none space-x-3">
          <button
            onClick={() => handleExport("csv")}
            disabled={exportMutation.isLoading}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <ArrowDownTrayIcon className="-ml-1 mr-2 h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <UserFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        isLoading={isLoading}
      />

      {/* Users Table */}
      <UserTable
        users={users}
        pagination={pagination}
        onPageChange={handlePageChange}
        onUserAction={handleUserAction}
        isLoading={isLoading}
      />

      {/* Status Update Modal */}
      <UserStatusModal
        isOpen={statusModalOpen}
        onClose={() => {
          setStatusModalOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onUpdate={handleStatusUpdate}
        isLoading={updateStatusMutation.isLoading}
      />
    </div>
  );
};

export default UsersPage;

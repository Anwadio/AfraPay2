import React from "react";

const MerchantsPage = () => {
  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Merchants</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage merchant accounts, approvals, and till systems.
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-gray-500">
          Merchant management interface will be implemented here.
        </p>
      </div>
    </div>
  );
};

export default MerchantsPage;

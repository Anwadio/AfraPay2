import React from "react";

const TransactionsPage = () => {
  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Transactions</h1>
          <p className="mt-2 text-sm text-gray-700">
            Monitor and manage all platform transactions in real-time.
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-gray-500">
          Transaction management interface will be implemented here.
        </p>
      </div>
    </div>
  );
};

export default TransactionsPage;

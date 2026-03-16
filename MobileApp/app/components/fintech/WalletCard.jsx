import React from 'react';
import { Card, CardContent, Badge } from '../ui';
import { cn, formatCurrency } from '../../utils';

/**
 * WalletCard Component
 * Display wallet balance and information
 */
const WalletCard = ({
  wallet,
  className,
  showActions = true,
  ...props
}) => {
  const getCurrencySymbol = (currency) => {
    const symbols = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      NGN: '₦',
      GHS: '₵',
      KES: 'KSh',
      ZAR: 'R'
    };
    return symbols[currency] || currency;
  };

  const getWalletTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'primary':
        return 'bg-primary-500';
      case 'savings':
        return 'bg-success-500';
      case 'business':
        return 'bg-warning-500';
      default:
        return 'bg-neutral-500';
    }
  };

  return (
    <Card className={cn('wallet-card', className)} {...props}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-white', getWalletTypeColor(wallet?.type))}>
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">{wallet?.name || 'Main Wallet'}</h3>
              <p className="text-sm text-neutral-500">{wallet?.type || 'Primary'} • {wallet?.currency || 'USD'}</p>
            </div>
          </div>
          <Badge variant={wallet?.status === 'active' ? 'success' : 'secondary'}>
            {wallet?.status || 'Active'}
          </Badge>
        </div>

        {/* Balance */}
        <div className="mb-6">
          <p className="text-sm text-neutral-600 mb-1">Available Balance</p>
          <p className="text-3xl font-bold text-neutral-900 currency">
            {getCurrencySymbol(wallet?.currency)}{formatCurrency(wallet?.balance || 0).replace(/[^\d,.-]/g, '')}
          </p>
          {wallet?.pendingBalance > 0 && (
            <p className="text-sm text-neutral-500 mt-1">
              + {getCurrencySymbol(wallet?.currency)}{formatCurrency(wallet?.pendingBalance)} pending
            </p>
          )}
        </div>

        {/* Account details */}
        {wallet?.accountNumber && (
          <div className="bg-neutral-50 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-neutral-700">Account Number</p>
                <p className="text-lg font-mono text-neutral-900">{wallet?.accountNumber}</p>
              </div>
              <button className="text-primary-600 hover:text-primary-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="grid grid-cols-3 gap-3">
            <button className="flex flex-col items-center p-3 rounded-lg border border-neutral-200 hover:border-primary-300 hover:bg-primary-50 transition-colors">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center mb-2">
                <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <span className="text-xs font-medium text-neutral-700">Add Money</span>
            </button>
            <button className="flex flex-col items-center p-3 rounded-lg border border-neutral-200 hover:border-primary-300 hover:bg-primary-50 transition-colors">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center mb-2">
                <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
              <span className="text-xs font-medium text-neutral-700">Send</span>
            </button>
            <button className="flex flex-col items-center p-3 rounded-lg border border-neutral-200 hover:border-primary-300 hover:bg-primary-50 transition-colors">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center mb-2">
                <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <span className="text-xs font-medium text-neutral-700">Exchange</span>
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * MiniWalletCard Component
 * Compact wallet display for lists
 */
const MiniWalletCard = ({
  wallet,
  onClick,
  className,
  ...props
}) => {
  const getCurrencySymbol = (currency) => {
    const symbols = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      NGN: '₦',
      GHS: '₵',
      KES: 'KSh',
      ZAR: 'R'
    };
    return symbols[currency] || currency;
  };

  return (
    <div
      className={cn(
        'p-4 rounded-lg border border-neutral-200 bg-white hover:border-primary-300 hover:shadow-md transition-all cursor-pointer',
        className
      )}
      onClick={onClick}
      {...props}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-neutral-900">{wallet?.name}</p>
          <p className="text-sm text-neutral-500">{wallet?.currency}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-neutral-900 currency">
            {getCurrencySymbol(wallet?.currency)}{formatCurrency(wallet?.balance || 0).replace(/[^\d,.-]/g, '')}
          </p>
          <Badge variant={wallet?.status === 'active' ? 'success' : 'secondary'} className="text-xs">
            {wallet?.status}
          </Badge>
        </div>
      </div>
    </div>
  );
};

export { WalletCard, MiniWalletCard };
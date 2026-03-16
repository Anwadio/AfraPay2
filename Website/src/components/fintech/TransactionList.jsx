import React from 'react';
import { cn, formatCurrency, formatSmartDate } from '../../utils';
import { Badge, Avatar } from '../ui';

/**
 * TransactionItem Component
 * Individual transaction list item
 */
const TransactionItem = ({
  transaction,
  onClick,
  showAvatar = true,
  className,
  ...props
}) => {
  const getTransactionIcon = (type, category) => {
    const iconProps = { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" };
    
    switch (type?.toLowerCase()) {
      case 'send':
      case 'transfer_out':
        return (
          <svg {...iconProps}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        );
      case 'receive':
      case 'transfer_in':
        return (
          <svg {...iconProps}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
          </svg>
        );
      case 'deposit':
      case 'top_up':
        return (
          <svg {...iconProps}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        );
      case 'withdrawal':
        return (
          <svg {...iconProps}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        );
      case 'payment':
        return (
          <svg {...iconProps}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        );
      default:
        return (
          <svg {...iconProps}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getTransactionColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'receive':
      case 'transfer_in':
      case 'deposit':
      case 'top_up':
        return 'text-success-600 bg-success-100';
      case 'send':
      case 'transfer_out':
      case 'withdrawal':
      case 'payment':
        return 'text-error-600 bg-error-100';
      default:
        return 'text-primary-700 bg-primary-100';
    }
  };

  const getAmountColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'receive':
      case 'transfer_in':
      case 'deposit':
      case 'top_up':
        return 'amount-positive';
      case 'send':
      case 'transfer_out':
      case 'withdrawal':
      case 'payment':
        return 'amount-negative';
      default:
        return 'text-primary-900';
    }
  };

  const getAmountPrefix = (type) => {
    switch (type?.toLowerCase()) {
      case 'receive':
      case 'transfer_in':
      case 'deposit':
      case 'top_up':
        return '+';
      case 'send':
      case 'transfer_out':
      case 'withdrawal':
      case 'payment':
        return '-';
      default:
        return '';
    }
  };

  return (
    <div
      className={cn(
        'flex items-center p-4 hover:bg-primary-50 transition-colors cursor-pointer',
        className
      )}
      onClick={() => onClick?.(transaction)}
      {...props}
    >
      {/* Icon or Avatar */}
      <div className="flex-shrink-0 mr-4">
        {showAvatar && transaction?.recipient?.avatar ? (
          <Avatar
            src={transaction.recipient.avatar}
            fallback={transaction.recipient.name?.charAt(0)}
            size="md"
          />
        ) : (
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', getTransactionColor(transaction?.type))}>
            {getTransactionIcon(transaction?.type, transaction?.category)}
          </div>
        )}
      </div>

      {/* Transaction details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-primary-900 truncate">
              {transaction?.description || transaction?.recipient?.name || 'Transaction'}
            </p>
            <p className="text-sm text-primary-600">
              {transaction?.reference || transaction?.id}
            </p>
          </div>
          <div className="flex items-center space-x-3 ml-4">
            <div className="text-right">
              <p className={cn('text-sm font-semibold currency', getAmountColor(transaction?.type))}>
                {getAmountPrefix(transaction?.type)}{formatCurrency(Math.abs(transaction?.amount || 0), transaction?.currency)}
              </p>
              <p className="text-xs text-primary-600">
                {formatSmartDate(transaction?.createdAt || transaction?.date)}
              </p>
            </div>
            <Badge variant={transaction?.status === 'completed' ? 'success' : 
                          transaction?.status === 'pending' ? 'warning' : 
                          transaction?.status === 'failed' ? 'error' : 'secondary'}>
              {transaction?.status || 'Pending'}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * TransactionList Component
 * List of transactions with grouping by date
 */
const TransactionList = ({
  transactions = [],
  onTransactionClick,
  showAvatar = true,
  groupByDate = true,
  className,
  ...props
}) => {
  // Group transactions by date if enabled
  const groupedTransactions = groupByDate ? 
    transactions.reduce((groups, transaction) => {
      const date = new Date(transaction.createdAt || transaction.date).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(transaction);
      return groups;
    }, {}) : { 'All': transactions };

  const formatDateHeader = (dateString) => {
    if (dateString === 'All') return null;
    
    const date = new Date(dateString);
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    if (dateString === today) return 'Today';
    if (dateString === yesterday) return 'Yesterday';
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className={cn('space-y-1', className)} {...props}>
      {Object.entries(groupedTransactions).map(([date, dayTransactions]) => (
        <div key={date}>
          {formatDateHeader(date) && (
            <div className="sticky top-0 bg-primary-50 border-b border-primary-200 px-4 py-2 z-10">
              <h3 className="text-xs font-semibold text-primary-600 uppercase tracking-wide">
                {formatDateHeader(date)}
              </h3>
            </div>
          )}
          <div className="divide-y divide-neutral-100">
            {dayTransactions.map((transaction, index) => (
              <TransactionItem
                key={transaction.id || index}
                transaction={transaction}
                onClick={onTransactionClick}
                showAvatar={showAvatar}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * TransactionSummary Component
 * Summary card showing transaction statistics
 */
const TransactionSummary = ({
  transactions = [],
  period = 'This Month',
  className,
  ...props
}) => {
  const calculateSummary = () => {
    const totalIn = transactions
      .filter(t => ['receive', 'transfer_in', 'deposit', 'top_up'].includes(t.type?.toLowerCase()))
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const totalOut = transactions
      .filter(t => ['send', 'transfer_out', 'withdrawal', 'payment'].includes(t.type?.toLowerCase()))
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const netFlow = totalIn - totalOut;
    
    return { totalIn, totalOut, netFlow };
  };

  const { totalIn, totalOut, netFlow } = calculateSummary();

  return (
    <div className={cn('bg-white rounded-xl border border-primary-200 p-6', className)} {...props}>
      <h3 className="text-lg font-semibold text-primary-900 mb-4">{period} Summary</h3>
      
      <div className="grid grid-cols-3 gap-6">
        <div>
          <p className="text-sm text-primary-700 mb-1">Money In</p>
          <p className="text-xl font-bold amount-positive currency">
            {formatCurrency(totalIn)}
          </p>
        </div>
        
        <div>
          <p className="text-sm text-primary-700 mb-1">Money Out</p>
          <p className="text-xl font-bold amount-negative currency">
            {formatCurrency(totalOut)}
          </p>
        </div>
        
        <div>
          <p className="text-sm text-primary-700 mb-1">Net Flow</p>
          <p className={cn(
            'text-xl font-bold currency',
            netFlow >= 0 ? 'amount-positive' : 'amount-negative'
          )}>
            {netFlow >= 0 ? '+' : ''}{formatCurrency(netFlow)}
          </p>
        </div>
      </div>
    </div>
  );
};

export { TransactionItem, TransactionList, TransactionSummary };
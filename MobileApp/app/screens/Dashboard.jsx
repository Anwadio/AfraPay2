/* eslint-disable no-console */
import { useRouter } from "expo-router";
import React from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

// Mock data
const mockWallets = [
  {
    id: 1,
    name: "Main Account",
    type: "checking",
    balance: 15420.5,
    availableBalance: 15420.5,
    number: "****1234",
    status: "active",
  },
  {
    id: 2,
    name: "Savings",
    type: "savings",
    balance: 8750.0,
    availableBalance: 8750.0,
    number: "****5678",
    status: "active",
  },
];

const mockTransactions = [
  {
    id: 1,
    type: "received",
    amount: 2500.0,
    description: "Salary Payment",
    recipient: "Employer Inc.",
    category: "Income",
    date: "2024-12-27",
    status: "completed",
  },
  {
    id: 2,
    type: "sent",
    amount: 350.0,
    description: "Grocery Shopping",
    recipient: "FreshMart",
    category: "Food & Dining",
    date: "2024-12-26",
    status: "completed",
  },
  {
    id: 3,
    type: "bill",
    amount: 120.5,
    description: "Internet Bill",
    recipient: "ISP Company",
    category: "Utilities",
    date: "2024-12-25",
    status: "completed",
  },
  {
    id: 4,
    type: "sent",
    amount: 80.0,
    description: "Coffee Shop",
    recipient: "Brew & Co.",
    category: "Food & Dining",
    date: "2024-12-25",
    status: "pending",
  },
];

// Mock user data
const mockUser = {
  name: "John Smith",
  email: "john.smith@example.com",
  avatar: null,
  role: "Premium Member",
};

const quickActions = [
  { id: "send", title: "Send Money", icon: "↗", color: "#3b82f6" },
  { id: "receive", title: "Request Money", icon: "↙", color: "#10b981" },
  { id: "bills", title: "Pay Bills", icon: "⚡", color: "#f59e0b" },
  { id: "exchange", title: "Exchange", icon: "↔", color: "#8b5cf6" },
];

const Dashboard = () => {
  const router = useRouter();

  const totalBalance = mockWallets.reduce(
    (sum, wallet) => sum + wallet.balance,
    0,
  );
  const monthlyIncome = mockTransactions
    .filter(
      (t) =>
        t.type === "received" &&
        new Date(t.date).getMonth() === new Date().getMonth(),
    )
    .reduce((sum, t) => sum + t.amount, 0);
  const monthlyExpenses = mockTransactions
    .filter(
      (t) =>
        t.type !== "received" &&
        new Date(t.date).getMonth() === new Date().getMonth(),
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const handleWalletSelect = (wallet) => {
    console.log("Selected wallet:", wallet);
    // Add navigation logic here
  };

  const handleTransactionClick = (transaction) => {
    console.log("Transaction clicked:", transaction);
    // Add navigation logic here
  };

  const handleQuickAction = (action) => {
    console.log(`Quick action: ${action}`);
    // Navigate based on action
    switch (action) {
      case "send":
        // router.push("/send-money");
        break;
      case "receive":
        // router.push("/receive-money");
        break;
      case "bills":
        // router.push("/pay-bills");
        break;
      case "exchange":
        // router.push("/exchange");
        break;
      default:
        break;
    }
  };

  const handleViewAllTransactions = () => {
    router.push("/screens/TransactionHistory");
  };

  const renderTransaction = ({ item }) => (
    <TouchableOpacity
      style={styles.transactionItem}
      onPress={() => handleTransactionClick(item)}
    >
      <View style={styles.transactionIcon}>
        <Text
          style={[
            styles.transactionIconText,
            { color: item.type === "received" ? "#10b981" : "#ef4444" },
          ]}
        >
          {item.type === "received" ? "↓" : "↑"}
        </Text>
      </View>
      <View style={styles.transactionDetails}>
        <Text style={styles.transactionDescription}>{item.description}</Text>
        <Text style={styles.transactionRecipient}>{item.recipient}</Text>
        <Text style={styles.transactionDate}>{item.date}</Text>
      </View>
      <View style={styles.transactionAmount}>
        <Text
          style={[
            styles.transactionAmountText,
            { color: item.type === "received" ? "#10b981" : "#ef4444" },
          ]}
        >
          {item.type === "received" ? "+" : "-"}${item.amount.toFixed(2)}
        </Text>
        <View
          style={[
            styles.transactionStatus,
            {
              backgroundColor:
                item.status === "completed" ? "#dcfce7" : "#fef3c7",
            },
          ]}
        >
          <Text
            style={[
              styles.transactionStatusText,
              { color: item.status === "completed" ? "#166534" : "#92400e" },
            ]}
          >
            {item.status}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Good morning!</Text>
          <Text style={styles.username}>{mockUser.name}</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Financial Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statTitle}>Total Balance</Text>
              <Text style={styles.statValue}>
                ${totalBalance.toLocaleString()}
              </Text>
              <Text style={styles.statChange}>+2.5% from last month</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statTitle}>Monthly Income</Text>
              <Text style={styles.statValue}>
                ${monthlyIncome.toLocaleString()}
              </Text>
              <Text style={styles.statChange}>+12.3% from last month</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statTitle}>Monthly Expenses</Text>
              <Text style={styles.statValue}>
                ${monthlyExpenses.toLocaleString()}
              </Text>
              <Text style={styles.statChange}>-5.2% from last month</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statTitle}>Net Savings</Text>
              <Text style={styles.statValue}>
                ${(monthlyIncome - monthlyExpenses).toLocaleString()}
              </Text>
              <Text style={styles.statChange}>+18.7% from last month</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[
                  styles.quickActionCard,
                  { borderLeftColor: action.color },
                ]}
                onPress={() => handleQuickAction(action.id)}
              >
                <Text style={[styles.quickActionIcon, { color: action.color }]}>
                  {action.icon}
                </Text>
                <Text style={styles.quickActionTitle}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Accounts Section */}
        <View style={styles.accountsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Accounts</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.accountsScroll}
          >
            {mockWallets.map((wallet, index) => (
              <TouchableOpacity
                key={wallet.id}
                style={[styles.accountCard, index === 0 && styles.primaryCard]}
                onPress={() => handleWalletSelect(wallet)}
              >
                <Text style={styles.accountName}>{wallet.name}</Text>
                <Text style={styles.accountNumber}>{wallet.number}</Text>
                <Text style={styles.balance}>
                  ${wallet.balance.toLocaleString()}
                </Text>
                <Text style={styles.availableBalance}>
                  Available: ${wallet.availableBalance.toLocaleString()}
                </Text>
                <View style={styles.accountActions}>
                  <TouchableOpacity style={styles.accountActionButton}>
                    <Text style={styles.accountActionText}>Transfer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.accountActionButton, styles.primaryButton]}
                  >
                    <Text
                      style={[
                        styles.accountActionText,
                        styles.primaryButtonText,
                      ]}
                    >
                      Details
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Recent Transactions */}
        <View style={styles.transactionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={handleViewAllTransactions}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.transactionsList}>
            {mockTransactions.slice(0, 5).map((transaction) => (
              <View key={transaction.id}>
                {renderTransaction({ item: transaction })}
              </View>
            ))}
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  greeting: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 4,
  },
  username: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
  },
  statsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statTitle: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  statChange: {
    fontSize: 12,
    color: "#10b981",
  },
  quickActionsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  quickActionCard: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  accountsSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  viewAllText: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "600",
  },
  accountsScroll: {
    paddingHorizontal: 20,
  },
  accountCard: {
    width: width * 0.75,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryCard: {
    backgroundColor: "#3b82f6",
  },
  accountName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  accountNumber: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 12,
  },
  balance: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  availableBalance: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
  },
  accountActions: {
    flexDirection: "row",
    gap: 8,
  },
  accountActionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  accountActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  primaryButtonText: {
    color: "#ffffff",
  },
  transactionsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  transactionsList: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  transactionIconText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  transactionRecipient: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: "#9ca3af",
  },
  transactionAmount: {
    alignItems: "flex-end",
  },
  transactionAmountText: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  transactionStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  transactionStatusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  bottomSpacing: {
    height: 20,
  },
});

export default Dashboard;

import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Share, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { transactionAPI } from "../../services/api";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { LoadingState, ErrorState } from "../../components/ui/States";

function formatCurrency(amount, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    parseFloat(amount || 0),
  );
}

function Row({ label, value, valueClass = "" }) {
  return (
    <View className="flex-row justify-between items-start py-3 border-b border-slate-50">
      <Text className="text-sm text-slate-400 flex-shrink-0 mr-4">{label}</Text>
      <Text
        className={`text-sm font-medium text-slate-800 text-right flex-1 ${valueClass}`}
        numberOfLines={2}
      >
        {value || "—"}
      </Text>
    </View>
  );
}

const STATUS_VARIANT = {
  completed: "completed",
  success: "success",
  pending: "pending",
  failed: "failed",
  cancelled: "error",
};

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) fetchTransaction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchTransaction = async () => {
    try {
      const res = await transactionAPI.getTransactionDetails(id);
      setTransaction(res.data?.transaction || res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load transaction");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!transaction) return;
    try {
      await Share.share({
        message: `AfraPay Transaction\nRef: ${transaction._id || transaction.id}\nAmount: ${formatCurrency(transaction.amount, transaction.currency)}\nStatus: ${transaction.status}\nDate: ${new Date(transaction.createdAt).toLocaleString()}`,
      });
    } catch {}
  };

  if (loading) return <LoadingState message="Loading transaction..." />;
  if (error || !transaction)
    return (
      <ErrorState
        message={error || "Transaction not found"}
        onRetry={fetchTransaction}
      />
    );

  const isDebit = ["send", "withdrawal", "payment"].includes(
    transaction.type?.toLowerCase(),
  );
  const statusVariant =
    STATUS_VARIANT[transaction.status?.toLowerCase()] || "default";

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Amount Hero */}
        <View
          className="items-center py-8 bg-white mx-5 mt-4 rounded-2xl"
          style={{
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 10,
            elevation: 3,
          }}
        >
          <View
            className={`w-16 h-16 rounded-2xl items-center justify-center mb-3 ${isDebit ? "bg-red-50" : "bg-emerald-50"}`}
          >
            <Text className="text-3xl">{isDebit ? "↗" : "↙"}</Text>
          </View>
          <Text
            className={`text-3xl font-bold ${isDebit ? "text-red-500" : "text-emerald-600"}`}
          >
            {isDebit ? "-" : "+"}
            {formatCurrency(transaction.amount, transaction.currency)}
          </Text>
          <View className="mt-2">
            <Badge
              label={transaction.status || "unknown"}
              variant={statusVariant}
            />
          </View>
          <Text className="text-slate-400 text-sm mt-2">
            {new Date(transaction.createdAt).toLocaleString()}
          </Text>
        </View>

        {/* Details */}
        <View className="px-5 mt-4">
          <Card>
            <Text className="text-sm font-bold text-slate-700 mb-2">
              Transaction Details
            </Text>
            <Row label="Reference" value={transaction._id || transaction.id} />
            <Row label="Type" value={transaction.type} />
            <Row label="Description" value={transaction.description} />
            <Row label="Currency" value={transaction.currency} />
            {transaction.fee !== undefined && (
              <Row
                label="Fee"
                value={formatCurrency(transaction.fee, transaction.currency)}
              />
            )}
            {transaction.exchangeRate && (
              <Row
                label="Exchange rate"
                value={String(transaction.exchangeRate)}
              />
            )}
          </Card>
        </View>

        {/* Sender / Recipient */}
        {(transaction.sender || transaction.recipient) && (
          <View className="px-5 mt-3">
            <Card>
              <Text className="text-sm font-bold text-slate-700 mb-2">
                Parties
              </Text>
              {transaction.sender && (
                <Row
                  label="Sender"
                  value={
                    transaction.sender?.name ||
                    transaction.sender?.email ||
                    transaction.sender
                  }
                />
              )}
              {transaction.recipient && (
                <Row
                  label="Recipient"
                  value={
                    transaction.recipient?.name ||
                    transaction.recipient?.email ||
                    transaction.recipient
                  }
                />
              )}
            </Card>
          </View>
        )}

        {/* Actions */}
        <View className="px-5 mt-4 gap-3 mb-8">
          <Button
            title="Share Receipt"
            onPress={handleShare}
            variant="outline"
            className="w-full"
          />
          {transaction.status === "pending" && (
            <Button
              title="Cancel Transaction"
              variant="danger"
              className="w-full"
              onPress={() =>
                Alert.alert("Cancel", "Cancel this transaction?", [
                  { text: "No", style: "cancel" },
                  {
                    text: "Cancel Transaction",
                    style: "destructive",
                    onPress: async () => {
                      try {
                        await transactionAPI.getTransactionDetails(id); // placeholder
                        router.back();
                      } catch (_err) {
                        Alert.alert("Error", "Could not cancel transaction");
                      }
                    },
                  },
                ])
              }
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

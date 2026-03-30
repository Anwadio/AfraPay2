import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { merchantAPI } from "../../services/api";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { LoadingState, ErrorState } from "../../components/ui/States";

function formatCurrency(amount, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    parseFloat(amount || 0),
  );
}

function StatCard({ label, value, sub, icon, color = "text-blue-600" }) {
  return (
    <Card className="flex-1 mx-1">
      <Text className="text-2xl mb-1">{icon}</Text>
      <Text className={`text-xl font-bold ${color}`}>{value}</Text>
      <Text className="text-xs text-slate-700 font-medium mt-0.5">{label}</Text>
      {sub && <Text className="text-xs text-slate-400 mt-0.5">{sub}</Text>}
    </Card>
  );
}

export default function MerchantScreen() {
  const [merchant, setMerchant] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [form, setForm] = useState({
    businessName: "",
    businessType: "retail",
    phoneNumber: "",
    address: "",
    description: "",
  });
  const [formErrors, setFormErrors] = useState({});

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await merchantAPI.getMyMerchant();
      const m = res.data?.merchant || res.data;
      setMerchant(m);
      if (m) {
        const analyticsRes = await merchantAPI.getAnalytics({
          period: "month",
        });
        setAnalytics(analyticsRes.data?.analytics || analyticsRes.data);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setMerchant(null); // Not registered yet
      } else {
        setError(err.response?.data?.message || "Failed to load merchant data");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const validateForm = () => {
    const e = {};
    if (!form.businessName.trim()) e.businessName = "Business name is required";
    if (!form.phoneNumber.trim()) e.phoneNumber = "Phone number is required";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;
    setRegistering(true);
    try {
      const res = await merchantAPI.register(form);
      setMerchant(res.data?.merchant || res.data);
      Alert.alert("Success! 🎉", "Your merchant account has been created.");
    } catch (err) {
      Alert.alert(
        "Registration Failed",
        err.response?.data?.message || "Please try again",
      );
    } finally {
      setRegistering(false);
    }
  };

  const set = (key) => (val) => setForm((p) => ({ ...p, [key]: val }));

  if (loading) return <LoadingState message="Loading merchant..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  // Registration form
  if (!merchant) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-5 pt-4 pb-10">
            {/* Hero */}
            <View className="items-center py-8">
              <View className="w-20 h-20 rounded-2xl bg-blue-600 items-center justify-center mb-4">
                <Text className="text-4xl">🏪</Text>
              </View>
              <Text className="text-2xl font-bold text-slate-900 text-center">
                Become a Merchant
              </Text>
              <Text className="text-slate-400 text-center mt-2 px-8">
                Accept payments, manage your business, and grow with AfraPay
              </Text>
            </View>

            {/* Benefits */}
            <View className="mb-6">
              {[
                { icon: "💸", text: "Accept payments from anyone" },
                { icon: "📊", text: "Real-time sales analytics" },
                { icon: "⚡", text: "Instant payouts to your wallet" },
                { icon: "🔒", text: "Secure & compliant transactions" },
              ].map((b) => (
                <View key={b.text} className="flex-row items-center gap-3 mb-3">
                  <Text className="text-xl">{b.icon}</Text>
                  <Text className="text-slate-700 text-sm">{b.text}</Text>
                </View>
              ))}
            </View>

            <Card>
              <Text className="text-base font-bold text-slate-900 mb-4">
                Business Details
              </Text>

              <Input
                label="Business name"
                value={form.businessName}
                onChangeText={set("businessName")}
                placeholder="My Awesome Store"
                autoCapitalize="words"
                error={formErrors.businessName}
              />

              {/* Business type */}
              <Text className="text-sm font-semibold text-slate-700 mb-2">
                Business type
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {[
                  "retail",
                  "restaurant",
                  "services",
                  "wholesale",
                  "salon",
                  "tech",
                  "logistics",
                  "other",
                ].map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => set("businessType")(t)}
                    className={`px-3 py-1.5 rounded-full border ${form.businessType === t ? "bg-blue-600 border-blue-600" : "border-slate-200"}`}
                  >
                    <Text
                      className={`text-sm capitalize ${form.businessType === t ? "text-white" : "text-slate-600"}`}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Business phone"
                value={form.phoneNumber}
                onChangeText={set("phoneNumber")}
                placeholder="+254700000000"
                keyboardType="phone-pad"
                error={formErrors.phoneNumber}
              />

              <Input
                label="Address (optional)"
                value={form.address}
                onChangeText={set("address")}
                placeholder="123 Main St, Nairobi"
                autoCapitalize="sentences"
              />

              <Input
                label="Description (optional)"
                value={form.description}
                onChangeText={set("description")}
                placeholder="Tell customers about your business..."
                multiline
                numberOfLines={3}
                autoCapitalize="sentences"
              />

              <Button
                title="Register as Merchant"
                onPress={handleRegister}
                loading={registering}
                size="lg"
                className="w-full mt-2"
              />
            </Card>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Merchant Dashboard
  const stats = analytics || {};
  const walletBalance = merchant.walletBalance || 0;

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2563eb"]}
          />
        }
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-2">
          <View className="flex-row items-center gap-3">
            <View className="w-12 h-12 rounded-xl bg-blue-600 items-center justify-center">
              <Text className="text-2xl">🏪</Text>
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-slate-900">
                {merchant.businessName}
              </Text>
              <View className="flex-row items-center gap-2 mt-0.5">
                <Badge
                  label={merchant.status || "active"}
                  variant={merchant.status === "active" ? "success" : "warning"}
                />
                <Text className="text-xs text-slate-400 capitalize">
                  {merchant.businessType}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Till Number */}
        {merchant.tillNumber && (
          <View className="px-5 mb-4">
            <Card className="bg-blue-50 border border-blue-200">
              <Text className="text-xs text-blue-500 font-medium mb-1">
                YOUR TILL NUMBER
              </Text>
              <Text className="text-3xl font-bold text-blue-700 tracking-widest">
                {merchant.tillNumber}
              </Text>
              <Text className="text-xs text-blue-400 mt-1">
                Share this with customers to receive payments
              </Text>
            </Card>
          </View>
        )}

        {/* Wallet Balance */}
        <View className="px-5 mb-4">
          <Card style={{ backgroundColor: "#2563eb" }}>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
              Merchant Wallet
            </Text>
            <Text
              style={{
                color: "#fff",
                fontSize: 28,
                fontWeight: "bold",
                marginTop: 4,
              }}
            >
              {formatCurrency(walletBalance)}
            </Text>
            <View className="flex-row gap-3 mt-4">
              <Button
                title="Request Payout"
                onPress={() => Alert.alert("Payout", "Feature coming soon")}
                variant="ghost"
                size="sm"
                className="flex-1"
              />
              <Button
                title="View Payouts"
                onPress={() => Alert.alert("Payouts", "Feature coming soon")}
                variant="ghost"
                size="sm"
                className="flex-1"
              />
            </View>
          </Card>
        </View>

        {/* Analytics Stats */}
        <View className="px-5 mb-4">
          <Text className="text-sm font-semibold text-slate-700 mb-3">
            Last 30 days
          </Text>
          <View className="flex-row mb-3">
            <StatCard
              icon="💰"
              label="Revenue"
              value={formatCurrency(stats.totalRevenue || stats.revenue || 0)}
              color="text-emerald-600"
            />
            <StatCard
              icon="📦"
              label="Transactions"
              value={String(stats.totalTransactions || stats.count || 0)}
              color="text-blue-600"
            />
          </View>
          <View className="flex-row">
            <StatCard
              icon="👥"
              label="Customers"
              value={String(stats.uniqueCustomers || stats.customers || 0)}
              color="text-purple-600"
            />
            <StatCard
              icon="📈"
              label="Avg. Transaction"
              value={formatCurrency(stats.averageTransaction || 0)}
              color="text-slate-700"
            />
          </View>
        </View>

        {/* Recent Transactions */}
        {stats.recentTransactions?.length > 0 && (
          <View className="px-5 mb-4">
            <Text className="text-sm font-semibold text-slate-700 mb-3">
              Recent Transactions
            </Text>
            <Card className="p-0 overflow-hidden">
              {stats.recentTransactions.map((tx, i) => (
                <View
                  key={tx._id || i}
                  className="flex-row items-center px-4 py-3 border-b border-slate-100"
                >
                  <View className="flex-1">
                    <Text
                      className="text-sm font-medium text-slate-800"
                      numberOfLines={1}
                    >
                      {tx.description || tx.reference || "Payment received"}
                    </Text>
                    <Text className="text-xs text-slate-400">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text className="text-sm font-bold text-emerald-600">
                    +{formatCurrency(tx.amount, tx.currency)}
                  </Text>
                </View>
              ))}
            </Card>
          </View>
        )}

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}

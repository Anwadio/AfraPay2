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
import { subscriptionAPI } from "../../services/api";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { LoadingState, ErrorState } from "../../components/ui/States";

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function PlanCard({ plan, currentSubscription, onSubscribe, subscribingId }) {
  const isActive =
    currentSubscription?.planId === (plan._id || plan.id) &&
    currentSubscription?.status === "active";
  const isPopular = plan.popular || plan.isPopular;

  return (
    <View
      className={`rounded-2xl p-5 mb-4 border-2 ${
        isActive
          ? "border-blue-600 bg-blue-50"
          : isPopular
            ? "border-emerald-500 bg-white"
            : "border-slate-200 bg-white"
      }`}
      style={
        isActive || isPopular
          ? {
              shadowColor: "#2563eb",
              shadowOpacity: 0.12,
              shadowRadius: 12,
              elevation: 4,
            }
          : {}
      }
    >
      {isPopular && !isActive && (
        <View className="absolute -top-3 self-center bg-emerald-500 px-3 py-1 rounded-full">
          <Text className="text-white text-xs font-bold">MOST POPULAR</Text>
        </View>
      )}

      <View className="flex-row justify-between items-start mb-3">
        <View>
          <Text className="text-lg font-bold text-slate-900">{plan.name}</Text>
          <Text className="text-slate-400 text-xs mt-0.5">
            {plan.description}
          </Text>
        </View>
        {isActive && <Badge label="Active" variant="success" />}
      </View>

      {/* Price */}
      <View className="flex-row items-end mb-4">
        <Text className="text-3xl font-bold text-blue-600">
          ${plan.price || plan.amount || 0}
        </Text>
        <Text className="text-slate-400 text-sm ml-1 mb-1">
          / {plan.interval || plan.billingCycle || "month"}
        </Text>
      </View>

      {/* Features */}
      {plan.features?.length > 0 && (
        <View className="mb-4">
          {plan.features.map((f, i) => (
            <View key={i} className="flex-row items-center gap-2 mb-1.5">
              <Text className="text-emerald-500 text-sm">✓</Text>
              <Text className="text-slate-600 text-sm">{f}</Text>
            </View>
          ))}
        </View>
      )}

      {isActive ? (
        <View className="flex-row gap-2">
          <Button
            title="Pause"
            onPress={() =>
              Alert.alert("Pause", "Pause subscription?", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Pause",
                  onPress: () =>
                    onSubscribe(
                      "pause",
                      currentSubscription._id || currentSubscription.id,
                    ),
                },
              ])
            }
            variant="outline"
            size="sm"
            className="flex-1"
          />
          <Button
            title="Cancel"
            onPress={() =>
              Alert.alert(
                "Cancel Subscription",
                "Are you sure you want to cancel?",
                [
                  { text: "No", style: "cancel" },
                  {
                    text: "Yes, Cancel",
                    style: "destructive",
                    onPress: () =>
                      onSubscribe(
                        "cancel",
                        currentSubscription._id || currentSubscription.id,
                      ),
                  },
                ],
              )
            }
            variant="danger"
            size="sm"
            className="flex-1"
          />
        </View>
      ) : (
        <Button
          title={`Subscribe — $${plan.price || plan.amount || 0}/${plan.interval || "month"}`}
          onPress={() => onSubscribe("subscribe", plan._id || plan.id)}
          loading={subscribingId === (plan._id || plan.id)}
          size="md"
          variant={isPopular ? "secondary" : "primary"}
          className="w-full"
        />
      )}
    </View>
  );
}

export default function SubscriptionsScreen() {
  const [plans, setPlans] = useState([]);
  const [mySubscriptions, setMySubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [subscribingId, setSubscribingId] = useState(null);
  const [activeTab, setActiveTab] = useState("plans");

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [plansRes, mySubsRes] = await Promise.all([
        subscriptionAPI.getPlans(),
        subscriptionAPI.getMySubscriptions(),
      ]);
      setPlans(plansRes.data?.plans || plansRes.data || []);
      setMySubscriptions(mySubsRes.data?.subscriptions || mySubsRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load subscriptions");
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

  const handleAction = async (action, id) => {
    setSubscribingId(id);
    try {
      switch (action) {
        case "subscribe":
          await subscriptionAPI.subscribe({ planId: id });
          Alert.alert("Subscribed! 🎉", "Your subscription is now active.");
          break;
        case "cancel":
          await subscriptionAPI.cancelSubscription(id);
          Alert.alert("Cancelled", "Your subscription has been cancelled.");
          break;
        case "pause":
          await subscriptionAPI.pauseSubscription(id);
          Alert.alert("Paused", "Your subscription has been paused.");
          break;
        case "resume":
          await subscriptionAPI.resumeSubscription(id);
          Alert.alert("Resumed", "Your subscription is now active again.");
          break;
      }
      await fetchData();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Action failed");
    } finally {
      setSubscribingId(null);
    }
  };

  if (loading) return <LoadingState message="Loading subscriptions..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  const activeSubscription = mySubscriptions.find((s) => s.status === "active");

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
        <View className="px-5 pt-4 pb-4">
          <Text className="text-xl font-bold text-slate-900">
            Subscriptions
          </Text>
          <Text className="text-slate-400 text-sm mt-0.5">
            Choose a plan that works for you
          </Text>
        </View>

        {/* Current Plan Banner */}
        {activeSubscription && (
          <View className="px-5 mb-4">
            <Card style={{ backgroundColor: "#2563eb" }}>
              <View className="flex-row justify-between items-start">
                <View>
                  <Text
                    style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}
                  >
                    Current Plan
                  </Text>
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 18,
                      fontWeight: "bold",
                      marginTop: 2,
                    }}
                  >
                    {activeSubscription.planName || "Active Plan"}
                  </Text>
                </View>
                <Badge label="Active" variant="success" />
              </View>
              <View className="flex-row items-center mt-3 gap-6">
                <View>
                  <Text
                    style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}
                  >
                    Next billing
                  </Text>
                  <Text
                    style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}
                  >
                    {formatDate(
                      activeSubscription.nextBillingDate ||
                        activeSubscription.renewsAt,
                    )}
                  </Text>
                </View>
                <View>
                  <Text
                    style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}
                  >
                    Amount
                  </Text>
                  <Text
                    style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}
                  >
                    $
                    {activeSubscription.amount || activeSubscription.price || 0}
                    /{activeSubscription.interval || "month"}
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* Tab Switcher */}
        <View className="flex-row mx-5 mb-4 p-1 bg-slate-100 rounded-xl">
          {[
            { key: "plans", label: "Available Plans" },
            { key: "history", label: "My Subscriptions" },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 rounded-lg items-center ${activeTab === tab.key ? "bg-white shadow-sm" : ""}`}
            >
              <Text
                className={`text-sm font-semibold ${activeTab === tab.key ? "text-slate-900" : "text-slate-400"}`}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View className="px-5">
          {activeTab === "plans" ? (
            plans.length === 0 ? (
              <View className="items-center py-8">
                <Text className="text-4xl mb-3">📦</Text>
                <Text className="text-slate-400">No plans available</Text>
              </View>
            ) : (
              plans.map((plan) => (
                <PlanCard
                  key={plan._id || plan.id}
                  plan={plan}
                  currentSubscription={activeSubscription}
                  onSubscribe={handleAction}
                  subscribingId={subscribingId}
                />
              ))
            )
          ) : mySubscriptions.length === 0 ? (
            <View className="items-center py-8">
              <Text className="text-4xl mb-3">📋</Text>
              <Text className="text-slate-400 text-sm">
                No subscriptions yet
              </Text>
            </View>
          ) : (
            mySubscriptions.map((sub) => (
              <Card key={sub._id || sub.id} className="mb-3">
                <View className="flex-row justify-between items-start mb-2">
                  <Text className="text-base font-bold text-slate-900">
                    {sub.planName || "Plan"}
                  </Text>
                  <Badge
                    label={sub.status}
                    variant={
                      sub.status === "active"
                        ? "success"
                        : sub.status === "paused"
                          ? "warning"
                          : sub.status === "cancelled"
                            ? "error"
                            : "default"
                    }
                  />
                </View>
                <View className="gap-1">
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-slate-400">Started</Text>
                    <Text className="text-xs text-slate-700">
                      {formatDate(sub.startDate || sub.createdAt)}
                    </Text>
                  </View>
                  {sub.nextBillingDate && (
                    <View className="flex-row justify-between">
                      <Text className="text-xs text-slate-400">
                        Next billing
                      </Text>
                      <Text className="text-xs text-slate-700">
                        {formatDate(sub.nextBillingDate)}
                      </Text>
                    </View>
                  )}
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-slate-400">Amount</Text>
                    <Text className="text-xs font-semibold text-slate-800">
                      ${sub.amount || sub.price || 0}/{sub.interval || "month"}
                    </Text>
                  </View>
                </View>
                {sub.status === "paused" && (
                  <Button
                    title="Resume"
                    onPress={() => handleAction("resume", sub._id || sub.id)}
                    loading={subscribingId === (sub._id || sub.id)}
                    variant="secondary"
                    size="sm"
                    className="mt-3 self-start"
                  />
                )}
              </Card>
            ))
          )}
        </View>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { notificationsAPI } from "../../services/api";
import { useTranslation } from "react-i18next";
import { timeAgo } from "../../utils/formatters";

import Button from "../../components/ui/Button";
import {
  LoadingState,
  EmptyState,
  ErrorState,
} from "../../components/ui/States";

const TYPE_ICONS = {
  transaction: "💸",
  security: "🔒",
  system: "⚙️",
  promotion: "🎁",
  alert: "⚠️",
  info: "ℹ️",
};

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setError(null);
      const res = await notificationsAPI.getNotifications({ limit: 50 });
      setNotifications(res.data?.data?.notifications || []);
    } catch (err) {
      setError(err.response?.data?.message || t("notifications.loadFailed"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, isRead: true })),
      );
    } catch (_err) {
      Alert.alert(t("common.error"), t("notifications.markReadFailed"));
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === id || n.id === id ? { ...n, read: true, isRead: true } : n,
        ),
      );
    } catch {}
  };

  // handleDelete available for future use
  // eslint-disable-next-line no-unused-vars
  const handleDelete = async (id) => {
    try {
      await notificationsAPI.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => (n._id || n.id) !== id));
    } catch {
      Alert.alert(t("common.error"), t("notifications.deleteFailed"));
    }
  };

  const unreadCount = notifications.filter((n) => !n.read && !n.isRead).length;

  if (loading) return <LoadingState message={t("notifications.loading")} />;
  if (error) return <ErrorState message={error} onRetry={fetchNotifications} />;

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
        <View>
          <Text className="text-xl font-bold text-slate-900">
            {t("notifications.title")}
          </Text>
          {unreadCount > 0 && (
            <Text className="text-xs text-slate-400 mt-0.5">
              {t("notifications.unreadCount", { count: unreadCount })}
            </Text>
          )}
        </View>
        {unreadCount > 0 && (
          <Button
            title={t("notifications.markAllRead")}
            onPress={handleMarkAllRead}
            variant="ghost"
            size="sm"
          />
        )}
      </View>

      {notifications.length === 0 ? (
        <EmptyState
          icon="🔔"
          title={t("notifications.empty")}
          message={t("notifications.emptyMessage")}
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id || item.id || String(Math.random())}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#2563eb"]}
            />
          }
          renderItem={({ item }) => {
            const isRead = item.read || item.isRead;
            const icon = TYPE_ICONS[item.type] || TYPE_ICONS.info;
            return (
              <TouchableOpacity
                onPress={() => !isRead && handleMarkRead(item._id || item.id)}
                className={`mx-4 mb-2 rounded-2xl p-4 border ${isRead ? "bg-white border-slate-100" : "bg-blue-50 border-blue-200"}`}
                style={
                  !isRead
                    ? {
                        shadowColor: "#2563eb",
                        shadowOpacity: 0.08,
                        shadowRadius: 6,
                        elevation: 2,
                      }
                    : {}
                }
              >
                <View className="flex-row items-start">
                  <View
                    className={`w-10 h-10 rounded-xl items-center justify-center mr-3 flex-shrink-0 ${isRead ? "bg-slate-100" : "bg-blue-100"}`}
                  >
                    <Text className="text-xl">{icon}</Text>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row justify-between items-start">
                      <Text
                        className={`text-sm font-semibold flex-1 mr-2 ${isRead ? "text-slate-700" : "text-blue-900"}`}
                        numberOfLines={1}
                      >
                        {item.title || t("notifications.defaultTitle")}
                      </Text>
                      <Text className="text-xs text-slate-400">
                        {timeAgo(item.createdAt)}
                      </Text>
                    </View>
                    <Text
                      className={`text-sm mt-0.5 ${isRead ? "text-slate-500" : "text-blue-700"}`}
                      numberOfLines={2}
                    >
                      {item.message || item.body || item.content}
                    </Text>
                  </View>
                </View>
                {!isRead && (
                  <View className="absolute top-3 right-3 w-2 h-2 rounded-full bg-blue-600" />
                )}
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </SafeAreaView>
  );
}

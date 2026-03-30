import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { educationAPI } from "../../services/api";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { LoadingState, EmptyState, ErrorState } from "../../components/ui/States";

const LEVEL_COLORS = {
  beginner: "success",
  intermediate: "info",
  advanced: "warning",
};

function ContentCard({ item, enrollments, onEnroll, enrollingId }) {
  const enrolled = enrollments.find(
    (e) => (e.contentId || e.content?._id) === (item._id || item.id),
  );
  const completed = enrolled?.status === "completed";
  const progress = enrolled?.progress || 0;

  return (
    <Card className="mb-3">
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 mr-3">
          <Text
            className="text-base font-bold text-slate-900"
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <Text className="text-xs text-slate-400 mt-0.5" numberOfLines={2}>
            {item.description}
          </Text>
        </View>
        {item.level && (
          <Badge
            label={item.level}
            variant={LEVEL_COLORS[item.level] || "default"}
          />
        )}
      </View>

      {/* Meta */}
      <View className="flex-row items-center gap-4 mt-2 mb-3">
        {item.duration && (
          <View className="flex-row items-center gap-1">
            <Text className="text-xs text-slate-400">⏱ {item.duration}</Text>
          </View>
        )}
        {item.category && (
          <View className="flex-row items-center gap-1">
            <Text className="text-xs text-slate-400">
              📚{" "}
              {typeof item.category === "string"
                ? item.category
                : item.category?.name}
            </Text>
          </View>
        )}
        {item.likes !== undefined && (
          <Text className="text-xs text-slate-400">❤️ {item.likes}</Text>
        )}
      </View>

      {/* Progress bar if enrolled */}
      {enrolled && (
        <View className="mb-3">
          <View className="flex-row justify-between mb-1">
            <Text className="text-xs text-slate-500">
              {completed ? "Completed ✓" : `Progress: ${progress}%`}
            </Text>
          </View>
          <View className="h-1.5 bg-slate-100 rounded-full">
            <View
              className={`h-1.5 rounded-full ${completed ? "bg-emerald-500" : "bg-blue-500"}`}
              style={{ width: `${progress}%` }}
            />
          </View>
        </View>
      )}

      {/* Action */}
      <Button
        title={
          completed ? "✓ Completed" : enrolled ? "Continue" : "Enroll Free"
        }
        onPress={() => !completed && onEnroll(item._id || item.id)}
        loading={enrollingId === (item._id || item.id)}
        variant={completed ? "ghost" : enrolled ? "secondary" : "primary"}
        size="sm"
        disabled={completed}
        className="self-start"
      />
    </Card>
  );
}

export default function EducationScreen() {
  const [categories, setCategories] = useState([]);
  const [content, setContent] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [enrollingId, setEnrollingId] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [catRes, contentRes, featRes, enrollRes] = await Promise.all([
        educationAPI.getCategories(),
        educationAPI.getContent({
          limit: 20,
          ...(activeCategory !== "all" && { category: activeCategory }),
        }),
        educationAPI.getFeaturedContent(),
        educationAPI.getEnrollments(),
      ]);
      setCategories(catRes.data?.categories || catRes.data || []);
      setContent(
        contentRes.data?.content ||
          contentRes.data?.data ||
          contentRes.data ||
          [],
      );
      setFeatured(featRes.data?.content || featRes.data || []);
      setEnrollments(enrollRes.data?.enrollments || enrollRes.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load education content",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleEnroll = async (contentId) => {
    setEnrollingId(contentId);
    try {
      await educationAPI.enrollInContent(contentId);
      const enrollRes = await educationAPI.getEnrollments();
      setEnrollments(enrollRes.data?.enrollments || enrollRes.data || []);
      Alert.alert(
        "Enrolled!",
        "You have been successfully enrolled in this course.",
      );
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to enroll");
    } finally {
      setEnrollingId(null);
    }
  };

  if (loading) return <LoadingState message="Loading courses..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  const allCategories = [{ _id: "all", name: "All" }, ...categories];

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
          <Text className="text-xl font-bold text-slate-900">
            Education Hub
          </Text>
          <Text className="text-slate-400 text-sm mt-0.5">
            Learn financial literacy & grow
          </Text>
        </View>

        {/* My Progress */}
        {enrollments.length > 0 && (
          <View className="px-5 mb-4">
            <Card className="bg-gradient-to-r from-blue-600 to-emerald-500 p-4">
              <View
                style={{
                  backgroundColor: "#2563eb",
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>
                  My Learning
                </Text>
                <View className="flex-row items-center gap-6 mt-2">
                  <View>
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 22,
                        fontWeight: "bold",
                      }}
                    >
                      {enrollments.length}
                    </Text>
                    <Text
                      style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}
                    >
                      Enrolled
                    </Text>
                  </View>
                  <View>
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 22,
                        fontWeight: "bold",
                      }}
                    >
                      {
                        enrollments.filter((e) => e.status === "completed")
                          .length
                      }
                    </Text>
                    <Text
                      style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}
                    >
                      Completed
                    </Text>
                  </View>
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* Category Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}
        >
          {allCategories.map((cat) => (
            <TouchableOpacity
              key={cat._id}
              onPress={() => setActiveCategory(cat._id)}
              className={`px-4 py-2 rounded-full mr-2 border ${
                activeCategory === cat._id
                  ? "bg-blue-600 border-blue-600"
                  : "bg-white border-slate-200"
              }`}
            >
              <Text
                className={`text-sm font-medium ${activeCategory === cat._id ? "text-white" : "text-slate-600"}`}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Featured Section */}
        {featured.length > 0 && activeCategory === "all" && (
          <View className="mb-4">
            <Text className="text-sm font-semibold text-slate-700 px-5 mb-3">
              ⭐ Featured
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            >
              {featured.slice(0, 5).map((item) => (
                <View
                  key={item._id || item.id}
                  className="w-64 mr-4 bg-white rounded-2xl p-4"
                  style={{
                    shadowColor: "#000",
                    shadowOpacity: 0.07,
                    shadowRadius: 8,
                    elevation: 3,
                  }}
                >
                  <Badge
                    label={item.level || "beginner"}
                    variant={LEVEL_COLORS[item.level] || "default"}
                    className="mb-2 self-start"
                  />
                  <Text
                    className="text-sm font-bold text-slate-900 mb-1"
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                  <Text
                    className="text-xs text-slate-400 mb-3"
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                  <Button
                    title="Enroll"
                    onPress={() => handleEnroll(item._id || item.id)}
                    loading={enrollingId === (item._id || item.id)}
                    size="sm"
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Content List */}
        <View className="px-5">
          <Text className="text-sm font-semibold text-slate-700 mb-3">
            {activeCategory === "all"
              ? "All Courses"
              : allCategories.find((c) => c._id === activeCategory)?.name}
            <Text className="text-slate-400 font-normal">
              {" "}
              ({content.length})
            </Text>
          </Text>

          {content.length === 0 ? (
            <EmptyState
              icon="📚"
              title="No content found"
              message="Try a different category"
            />
          ) : (
            content.map((item) => (
              <ContentCard
                key={item._id || item.id}
                item={item}
                enrollments={enrollments}
                onEnroll={handleEnroll}
                enrollingId={enrollingId}
              />
            ))
          )}
        </View>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}

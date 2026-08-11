import { Tabs, useRouter } from "expo-router";
import { useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import PremiumTabBar from "../../components/ui/PremiumTabBar";

export default function TabsLayout() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/(auth)/login");
    }
  }, [isAuthenticated, loading, router]);

  if (loading || !isAuthenticated) return null;

  return (
    <Tabs
      tabBar={(props) => <PremiumTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
      sceneContainerStyle={{ paddingBottom: 92 }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="send" />
      <Tabs.Screen name="transactions" />
      <Tabs.Screen name="cards" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}

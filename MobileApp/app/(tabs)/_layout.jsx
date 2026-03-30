import { Tabs } from "expo-router";
import PremiumTabBar from "../../components/ui/PremiumTabBar";

export default function TabsLayout() {
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

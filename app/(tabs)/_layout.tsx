import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { useColors } from "@/hooks/use-colors";

type IconName = React.ComponentProps<typeof MaterialIcons>["name"];

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: "index", title: "Pano", icon: "dashboard" },
  { name: "niche", title: "Keşif", icon: "trending-up" },
  { name: "planner", title: "Planlama", icon: "event-note" },
  { name: "analysis", title: "Analiz", icon: "insights" },
  { name: "assistant", title: "Asistan", icon: "auto-awesome" },
];

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.info,
        tabBarInactiveTintColor: colors.muted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarLabelStyle: { fontSize: 10 },
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: "#12062A",
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color }) => <MaterialIcons name={t.icon} size={24} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}

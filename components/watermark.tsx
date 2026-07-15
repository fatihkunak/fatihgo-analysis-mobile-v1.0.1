import { View, Text, Image } from "react-native";
import { useColors } from "@/hooks/use-colors";

export function Watermark() {
  const colors = useColors();

  return (
    <View
      className="items-center justify-center py-3 border-t"
      style={{ borderTopColor: colors.border }}
    >
      <View className="flex-row items-center gap-2 mb-2">
        <Image
          source={require("@/assets/images/logo.png")}
          style={{ width: 24, height: 24 }}
        />
        <Text className="text-xs font-semibold text-foreground">
          Fatihgo Analysis
        </Text>
      </View>
      <Text className="text-xs text-muted">www.fatihgo.com</Text>
      <Text className="text-xs text-muted">Contact: info@fatihgo.com</Text>
    </View>
  );
}

import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";

/**
 * AppWatermark Component
 * 
 * Subtle background watermark visible on all screens.
 * Uses pointerEvents: "none" so touches pass through.
 * Contact info is displayed in Settings > About section.
 */
export function AppWatermark() {
  const colors = useColors();

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.backgroundWatermark}>
        <Text style={[styles.watermarkText, { color: colors.muted }]}>FG</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  backgroundWatermark: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.12,
    transform: [{ rotate: "-15deg" }],
  },
  watermarkText: {
    fontSize: 240,
    fontWeight: "900",
    letterSpacing: 30,
  },
});

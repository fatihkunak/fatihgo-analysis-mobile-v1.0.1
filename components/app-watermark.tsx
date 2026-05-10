import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";

/**
 * AppWatermark Component
 * 
 * Provides:
 * 1. Background watermark (FG text with low opacity)
 * 2. Subtle contact info watermark at bottom
 * 
 * Should be placed in the root layout to appear on all screens
 */
export function AppWatermark() {
  const colors = useColors();

  return (
    <View style={styles.container}>
      {/* Background Watermark - FG Text */}
      <View style={styles.backgroundWatermark}>
        <Text style={[styles.watermarkText, { color: colors.border }]}>FG</Text>
      </View>

      {/* Subtle Footer Watermark - Very Transparent */}
      <View style={styles.footerWatermark}>
        <Text style={[styles.footerWatermarkText, { color: colors.border }]}>
          www.fatihgo.com | info@fatihgo.com
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: "none", // Allow touches to pass through
    zIndex: -1, // Behind all content
  },
  backgroundWatermark: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.05,
    zIndex: 0,
  },
  watermarkText: {
    fontSize: 120,
    fontWeight: "900",
    letterSpacing: 20,
  },
  footerWatermark: {
    position: "absolute",
    bottom: 20,
    left: 10,
    right: 10,
    zIndex: 0,
  },
  footerWatermarkText: {
    fontSize: 8,
    textAlign: "center",
    opacity: 0.3,
  },
});

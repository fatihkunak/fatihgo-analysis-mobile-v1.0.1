import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ActivityIndicator, Image, Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop } from "react-native-svg";

import { useColors } from "@/hooks/use-colors";
import { useSession } from "@/lib/session";

export const GRADIENT = ["#4F8CFF", "#8B5CF6", "#D946EF"] as const;

export function GradientButton({
  title,
  onPress,
  loading,
  disabled,
  style,
  small,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const off = disabled || loading;
  return (
    <Pressable onPress={onPress} disabled={off} style={[{ opacity: off ? 0.55 : 1 }, style]}>
      <LinearGradient
        colors={GRADIENT}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{
          borderRadius: 999,
          paddingVertical: small ? 9 : 14,
          paddingHorizontal: small ? 16 : 20,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: small ? 13 : 16 }}>{title}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

export function Card({
  children,
  style,
  title,
  hint,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  title?: string;
  hint?: string;
}) {
  return (
    <View
      className="bg-surface border border-border rounded-2xl p-3 mb-3"
      style={[{ backgroundColor: "rgba(26,14,54,0.85)" }, style]}
    >
      {title ? (
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-foreground font-semibold text-[15px]">{title}</Text>
          {hint ? <Text className="text-muted text-[10px]">{hint}</Text> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: active ? colors.accent : colors.border,
        backgroundColor: active ? "rgba(224,64,200,0.18)" : "rgba(139,92,246,0.10)",
      }}
    >
      <Text style={{ color: active ? "#fff" : colors.foreground, fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}

export function ScreenHeader({ title, avatar = true }: { title: string; avatar?: boolean }) {
  const router = useRouter();
  const { profile } = useSession();
  const colors = useColors();
  return (
    <View className="flex-row items-center justify-between mb-3">
      <Text className="text-foreground text-2xl font-bold">{title}</Text>
      {avatar ? (
        <Pressable
          onPress={() => router.push("/profile")}
          accessibilityLabel="Profil ve ayarlar"
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: colors.accent,
            backgroundColor: "rgba(139,92,246,0.25)",
          }}
        >
          <Text className="text-foreground font-bold">{(profile?.name || "N").slice(0, 1).toUpperCase()}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Logo({ size = 96 }: { size?: number }) {
  return (
    <Image
      source={require("@/assets/images/logo.png")}
      style={{ width: size, height: size, borderRadius: size * 0.22 }}
      resizeMode="cover"
    />
  );
}

/** Alan grafiği: değerleri 0..max aralığına ölçekler. */
export function Sparkline({
  data,
  height = 70,
  width = 160,
  color = "#38BDF8",
}: {
  data: number[];
  height?: number;
  width?: number;
  color?: string;
}) {
  if (data.length < 2) return <View style={{ height }} />;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = Math.max(1, max - min);
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => [i * step, height - 6 - ((v - min) / span) * (height - 12)] as const);
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <Defs>
        <SvgGradient id={`g${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.45} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </SvgGradient>
      </Defs>
      <Path d={area} fill={`url(#g${color.slice(1)})`} />
      <Path d={line} stroke={color} strokeWidth={2} fill="none" />
    </Svg>
  );
}

/** Dikey çubuk grafiği. */
export function Bars({
  data,
  labels,
  height = 110,
  highlightFrom,
}: {
  data: number[];
  labels?: string[];
  height?: number;
  highlightFrom?: number;
}) {
  const max = Math.max(1, ...data);
  return (
    <View>
      <View className="flex-row items-end justify-between" style={{ height }}>
        {data.map((v, i) => (
          <View key={i} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height }}>
            <LinearGradient
              colors={i >= (highlightFrom ?? Infinity) ? ["#D946EF", "#8B5CF6"] : ["#38BDF8", "#8B5CF6"]}
              style={{ width: "58%", height: Math.max(4, (v / max) * (height - 6)), borderRadius: 4 }}
            />
          </View>
        ))}
      </View>
      {labels ? (
        <View className="flex-row justify-between mt-1">
          {labels.map((l, i) => (
            <Text key={i} className="text-muted text-[9px] flex-1 text-center">
              {l}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Rekabet ısı haritası (düşük = mavi, yüksek = magenta). */
export function Heatmap({
  rows,
  cols,
  data,
}: {
  rows: string[];
  cols: string[];
  data: number[][];
}) {
  const color = (v: number) => {
    const r = Math.round(56 + v * (217 - 56));
    const g = Math.round(189 + v * (70 - 189));
    const b = Math.round(248 + v * (239 - 248));
    return `rgba(${r},${g},${b},${0.35 + v * 0.55})`;
  };
  return (
    <View>
      <View className="flex-row" style={{ marginLeft: 62 }}>
        {cols.map((c) => (
          <Text key={c} className="text-muted text-[9px] flex-1 text-center">
            {c}
          </Text>
        ))}
      </View>
      {rows.map((r, ri) => (
        <View key={r} className="flex-row items-center mt-1">
          <Text className="text-muted text-[10px]" style={{ width: 62 }}>
            {r}
          </Text>
          {data[ri].map((v, ci) => (
            <View key={ci} style={{ flex: 1, height: 26, margin: 1, borderRadius: 4, backgroundColor: color(v) }} />
          ))}
        </View>
      ))}
    </View>
  );
}

/** Dairesel skor göstergesi. */
export function Gauge({ value, size = 96 }: { value: number; size?: number }) {
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value)) / 100;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Defs>
          <SvgGradient id="gauge" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#38BDF8" />
            <Stop offset="1" stopColor="#D946EF" />
          </SvgGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#3A2766" strokeWidth={8} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#gauge)"
          strokeWidth={8}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text className="text-foreground font-bold" style={{ fontSize: size * 0.3 }}>
        {value}
      </Text>
    </View>
  );
}

/** İki uçlu oran çubuğu (olumlu / olumsuz). */
export function SplitBar({ positive, negative }: { positive: number; negative: number }) {
  const neutral = Math.max(0, 100 - positive - negative);
  return (
    <View className="flex-row overflow-hidden rounded-full" style={{ height: 10 }}>
      <View style={{ flex: positive || 0.001, backgroundColor: "#34D399" }} />
      <View style={{ flex: neutral || 0.001, backgroundColor: "#6B5B95" }} />
      <View style={{ flex: negative || 0.001, backgroundColor: "#F87171" }} />
    </View>
  );
}

export function WordCloud({ words }: { words: { word: string; count: number }[] }) {
  const palette = ["#38BDF8", "#8B5CF6", "#D946EF", "#F5F0FF", "#A99BC9"];
  const max = Math.max(1, ...words.map((w) => w.count));
  return (
    <View className="flex-row flex-wrap items-center justify-center">
      {words.map((w, i) => (
        <Text
          key={w.word}
          style={{
            fontSize: 12 + (w.count / max) * 16,
            color: palette[i % palette.length],
            fontWeight: w.count / max > 0.6 ? "700" : "500",
            margin: 4,
          }}
        >
          {w.word}
        </Text>
      ))}
    </View>
  );
}

export function SampleBadge() {
  return (
    <View style={{ alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: "rgba(251,191,36,0.18)" }}>
      <Text style={{ color: "#FBBF24", fontSize: 9 }}>Örnek veri</Text>
    </View>
  );
}

import { useState } from "react";
import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native";

import { useColors } from "@/hooks/use-colors";

export function Field({
  label,
  secure,
  ...props
}: TextInputProps & { label?: string; secure?: boolean }) {
  const colors = useColors();
  const [hidden, setHidden] = useState(!!secure);
  return (
    <View className="mb-3">
      {label ? <Text className="text-foreground text-[13px] mb-1.5">{label}</Text> : null}
      <View
        className="flex-row items-center rounded-xl border"
        style={{ borderColor: colors.border, backgroundColor: "rgba(13,6,32,0.7)" }}
      >
        <TextInput
          {...props}
          secureTextEntry={hidden}
          placeholderTextColor={colors.muted}
          className="flex-1 text-foreground"
          style={{ paddingVertical: 12, paddingHorizontal: 12 }}
        />
        {secure ? (
          <Pressable onPress={() => setHidden((h) => !h)} className="px-3" accessibilityLabel="Şifreyi göster/gizle">
            <Text style={{ color: colors.muted, fontSize: 12 }}>{hidden ? "Göster" : "Gizle"}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

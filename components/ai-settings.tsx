import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Linking, Modal, Pressable, Text, TextInput, View } from "react-native";

import { Field } from "@/components/field";
import { Card, GradientButton } from "@/components/nv";
import { useColors } from "@/hooks/use-colors";
import { loadAiConfig, saveAiConfig } from "@/lib/ai-config";
import {
  GROUP_LABELS,
  GROUP_ORDER,
  PROVIDERS,
  baseUrlEditable,
  check,
  getProvider,
  listModels,
  resolve,
  type AiConfig,
  type ProviderInfo,
} from "@/lib/ai-providers";

type Picker = null | "provider" | "model";

export function AiSettings() {
  const colors = useColors();
  const [cfg, setCfg] = useState<AiConfig | null>(null);
  const [picker, setPicker] = useState<Picker>(null);
  const [models, setModels] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState<null | "models" | "test" | "save">(null);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadAiConfig().then(setCfg);
    }, []),
  );

  const info: ProviderInfo | undefined = cfg ? getProvider(cfg.provider) : undefined;
  const shownModels = useMemo(
    () => models.filter((m) => !filter || m.toLowerCase().includes(filter.toLowerCase())),
    [models, filter],
  );

  if (!cfg || !info) return null;

  const patch = (p: Partial<AiConfig>) => setCfg({ ...cfg, ...p });
  const setKey = (v: string) => patch({ apiKeys: { ...cfg.apiKeys, [info.id]: v } });

  const pickProvider = (p: ProviderInfo) => {
    if (p.id !== info.id) {
      // Her sağlayıcının anahtarı ayrı saklanır; model/adres sıfırlanır
      patch({ provider: p.id, model: p.defaultModel ?? "", baseUrl: "" });
      setModels([]);
      setStatus(null);
    }
    setPicker(null);
  };

  const run = async (kind: "models" | "test") => {
    setBusy(kind);
    setStatus(null);
    try {
      const creds = resolve(cfg);
      if (kind === "models") {
        const list = await listModels(creds);
        setModels(list);
        setFilter("");
        if (list.length) setPicker("model");
        else setStatus({ ok: false, msg: "Sağlayıcı model listesi döndürmedi; adı elle yazın." });
      } else {
        const ms = await check(creds);
        setStatus({ ok: true, msg: `Bağlantı çalışıyor (${ms} ms)` });
      }
    } catch (e) {
      setStatus({ ok: false, msg: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    setBusy("save");
    try {
      await saveAiConfig(cfg);
      setStatus({ ok: true, msg: "Kaydedildi" });
    } catch (e) {
      setStatus({ ok: false, msg: "Kaydedilemedi: " + (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const configured = (p: ProviderInfo) => !p.needsKey || !!(cfg.apiKeys[p.id] ?? "").trim();

  return (
    <Card title="Yapay Zeka Sağlayıcısı" hint="asistan · fikirler · sahne analizi">
      <Text className="text-muted text-[12px] mb-1">Sağlayıcı</Text>
      <Pressable
        onPress={() => setPicker("provider")}
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 12,
          marginBottom: 10,
          backgroundColor: "rgba(13,6,32,0.7)",
        }}
      >
        <Text className="text-foreground text-[14px]">{info.label}</Text>
        <Text style={{ color: colors.muted }}>▾</Text>
      </Pressable>

      {baseUrlEditable(info) ? (
        <Field
          label="Adres"
          value={cfg.baseUrl}
          onChangeText={(v) => patch({ baseUrl: v })}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={info.baseUrl ?? "https://…/v1"}
        />
      ) : (
        <Text className="text-muted text-[11px] mb-2">Adres: {info.baseUrl}</Text>
      )}

      {info.needsKey ? (
        <View>
          <Field
            label="API anahtarı"
            value={cfg.apiKeys[info.id] ?? ""}
            onChangeText={setKey}
            secure
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="anahtarınızı yapıştırın"
          />
          {info.keyUrl ? (
            <Pressable onPress={() => Linking.openURL(info.keyUrl!)} style={{ marginTop: -6, marginBottom: 8 }}>
              <Text style={{ color: colors.info, fontSize: 12 }}>anahtar al ↗</Text>
            </Pressable>
          ) : null}
          <Text className="text-muted text-[11px] mb-2">
            Anahtar cihazın güvenli deposunda saklanır; yalnızca seçtiğiniz sağlayıcıya gönderilir.
          </Text>
        </View>
      ) : (
        <Text className="text-muted text-[11px] mb-2">Bu sağlayıcı anahtar istemez (aynı ağdaki PC&apos;de çalışmalı).</Text>
      )}

      <Text className="text-muted text-[12px] mb-1">Model</Text>
      <View className="flex-row items-center mb-2">
        <TextInput
          value={cfg.model}
          onChangeText={(v) => patch({ model: v })}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={info.defaultModel ?? "model adı"}
          placeholderTextColor={colors.muted}
          className="flex-1 text-foreground border border-border rounded-xl px-3 mr-2"
          style={{ paddingVertical: 10, backgroundColor: "rgba(13,6,32,0.7)" }}
        />
        <GradientButton title="Modelleri getir" small onPress={() => run("models")} loading={busy === "models"} />
      </View>

      <View className="flex-row">
        <GradientButton
          title="Bağlantıyı test et"
          small
          onPress={() => run("test")}
          loading={busy === "test"}
          style={{ marginRight: 8 }}
        />
        <GradientButton title="Kaydet" small onPress={save} loading={busy === "save"} />
      </View>
      <Text className="text-muted text-[11px] mt-2">
        “Test” küçük bir gerçek istek atar (birkaç token harcar). Model boşsa sağlayıcının varsayılanı kullanılır.
      </Text>
      {status ? (
        <Text style={{ color: status.ok ? colors.success : colors.error, fontSize: 12, marginTop: 8 }}>
          {status.ok ? "✓ " : "✗ "}
          {status.msg}
        </Text>
      ) : null}

      <Modal visible={picker !== null} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <Pressable
          onPress={() => setPicker(null)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              maxHeight: "75%",
              backgroundColor: "#160A30",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 16,
            }}
          >
            {picker === "provider" ? (
              <FlatList
                data={GROUP_ORDER}
                keyExtractor={(g) => g}
                renderItem={({ item: g }) => (
                  <View style={{ marginBottom: 8 }}>
                    <Text className="text-muted text-[11px] mb-1">{GROUP_LABELS[g]}</Text>
                    {PROVIDERS.filter((p) => p.group === g).map((p) => (
                      <Pressable
                        key={p.id}
                        onPress={() => pickProvider(p)}
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          paddingVertical: 12,
                          borderBottomWidth: 1,
                          borderBottomColor: colors.border,
                        }}
                      >
                        <Text style={{ color: p.id === info.id ? colors.accent : colors.foreground, fontSize: 15 }}>
                          {p.label}
                        </Text>
                        <Text style={{ color: configured(p) ? colors.success : colors.muted, fontSize: 12 }}>
                          {p.needsKey ? (configured(p) ? "anahtar var" : "anahtar yok") : ""}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              />
            ) : (
              <View style={{ flexShrink: 1 }}>
                <TextInput
                  value={filter}
                  onChangeText={setFilter}
                  placeholder="ara"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="none"
                  className="text-foreground border border-border rounded-xl px-3 mb-2"
                  style={{ paddingVertical: 8 }}
                />
                <FlatList
                  data={shownModels}
                  keyExtractor={(m) => m}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item: m }) => (
                    <Pressable
                      onPress={() => {
                        patch({ model: m });
                        setPicker(null);
                      }}
                      style={{ paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border }}
                    >
                      <Text style={{ color: m === cfg.model ? colors.accent : colors.foreground, fontSize: 14 }}>{m}</Text>
                    </Pressable>
                  )}
                />
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </Card>
  );
}

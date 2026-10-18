import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

import { Card, GradientButton, ScreenHeader } from "@/components/nv";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { aiStatus, generateIdeas as aiGenerateIdeas, generatePlan, templateIdeas } from "@/lib/ai";
import { WEEK_DAYS } from "@/lib/insights";
import { templatePlan, type Phase } from "@/lib/plan";
import { sharePlanPDF, type PlanData } from "@/lib/report-service";
import { bumpUsage } from "@/lib/usage";

type PlanEvent = { id: string; day: number; title: string };

const EVENTS_KEY = "nichevo.planner";

export default function PlannerScreen() {
  const colors = useColors();
  const [niche, setNiche] = useState("");
  const [topic, setTopic] = useState("");
  const [plan, setPlan] = useState<Phase[]>([]);
  const [planBusy, setPlanBusy] = useState(false);
  const [planNote, setPlanNote] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const [events, setEvents] = useState<PlanEvent[]>([]);
  const [day, setDay] = useState((new Date().getDay() + 6) % 7);
  const [newTitle, setNewTitle] = useState("");

  const [ideaNiche, setIdeaNiche] = useState("");
  const [ideas, setIdeas] = useState<string[]>([]);
  const [ideasBusy, setIdeasBusy] = useState(false);
  const [ideaNote, setIdeaNote] = useState("");

  useEffect(() => {
    AsyncStorage.getItem(EVENTS_KEY)
      .then((raw) => raw && setEvents(JSON.parse(raw)))
      .catch(() => {});
  }, []);

  const saveEvents = useCallback((next: PlanEvent[]) => {
    setEvents(next);
    AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const addEvent = (title: string, d = day) => {
    const t = title.trim();
    if (!t) return;
    saveEvents([...events, { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), day: d, title: t }]);
    setNewTitle("");
  };

  const generateIdeas = async () => {
    if (!ideaNiche.trim()) return Alert.alert("Uyarı", "Önce bir niş girin.");
    setIdeasBusy(true);
    setIdeaNote("");
    try {
      if ((await aiStatus()).creds) {
        setIdeas(await aiGenerateIdeas(ideaNiche.trim()));
      } else {
        setIdeas(templateIdeas(ideaNiche.trim()));
        setIdeaNote("AI sağlayıcı ayarlı değil (Profil > Yapay Zeka); şablon fikirler gösteriliyor.");
      }
    } catch (e) {
      setIdeas(templateIdeas(ideaNiche.trim()));
      setIdeaNote("AI hatası (" + (e as Error).message + "); şablon fikirler gösteriliyor.");
    } finally {
      setIdeasBusy(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!niche.trim() || !topic.trim()) {
      Alert.alert("Uyarı", "Lütfen niş ve konu girin.");
      return;
    }
    const n = niche.trim();
    const t = topic.trim();
    setPlanBusy(true);
    setPlanNote("");
    try {
      if ((await aiStatus()).creds) {
        setPlan(await generatePlan(n, t));
      } else {
        setPlan(templatePlan(n, t));
        setPlanNote("AI sağlayıcı ayarlı değil (Profil > Yapay Zeka); kalıp plan gösteriliyor.");
      }
    } catch (e) {
      setPlan(templatePlan(n, t));
      setPlanNote("AI hatası (" + (e as Error).message + "); kalıp plan gösteriliyor.");
    } finally {
      setPlanBusy(false);
    }
    bumpUsage("plans");
  };

  const handleExportPDF = useCallback(async () => {
    if (plan.length === 0) return;

    setIsExporting(true);
    try {
      const planData: PlanData = {
        niche,
        topic,
        phases: plan,
      };
      await sharePlanPDF(planData);
    } catch {
      Alert.alert("Hata", "PDF oluşturulamadı");
    }
    setIsExporting(false);
  }, [plan, niche, topic]);

  const dayEvents = events.filter((e) => e.day === day);

  return (
    <ScreenContainer className="px-4 pt-2">
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
        <ScreenHeader title="İçerik Planlama" />

        <Card title="Haftalık Takvim" hint="her hafta tekrar eder">
          <View className="flex-row">
            {WEEK_DAYS.map((d, i) => {
              const count = events.filter((e) => e.day === i).length;
              const active = i === day;
              return (
                <Pressable
                  key={d}
                  onPress={() => setDay(i)}
                  style={{
                    alignItems: "center",
                    borderRadius: 8,
                    paddingVertical: 8,
                    flex: 1,
                    marginHorizontal: 1.5,
                    backgroundColor: active ? "rgba(139,92,246,0.35)" : "rgba(139,92,246,0.08)",
                    borderWidth: 1,
                    borderColor: active ? colors.accent : "transparent",
                  }}
                >
                  <Text className="text-foreground text-[11px]">{d}</Text>
                  <Text style={{ color: count ? colors.info : colors.muted, fontSize: 13, fontWeight: "700", marginTop: 2 }}>
                    {count || "·"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View className="mt-3">
            {dayEvents.length === 0 ? (
              <Text className="text-muted text-[12px]">{WEEK_DAYS[day]} için planlı içerik yok.</Text>
            ) : (
              dayEvents.map((e) => (
                <View key={e.id} className="flex-row items-center justify-between py-2 border-b border-border">
                  <Text className="text-foreground text-[13px] flex-1 pr-2">{e.title}</Text>
                  <Pressable onPress={() => saveEvents(events.filter((x) => x.id !== e.id))} accessibilityLabel="Sil">
                    <Text style={{ color: colors.error, fontSize: 12 }}>Sil</Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>
          <View className="flex-row items-center mt-3">
            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="İçerik ekle..."
              placeholderTextColor={colors.muted}
              onSubmitEditing={() => addEvent(newTitle)}
              className="flex-1 text-foreground border border-border rounded-xl px-3 mr-2"
              style={{ paddingVertical: 8, backgroundColor: "rgba(13,6,32,0.7)" }}
            />
            <GradientButton title="Ekle" small onPress={() => addEvent(newTitle)} />
          </View>
        </Card>

        <Card title="Fikir Oluşturucu">
          <View className="flex-row items-center">
            <TextInput
              value={ideaNiche}
              onChangeText={setIdeaNiche}
              placeholder="Nişinizi girin..."
              placeholderTextColor={colors.muted}
              className="flex-1 text-foreground border border-border rounded-xl px-3 mr-2"
              style={{ paddingVertical: 8, backgroundColor: "rgba(13,6,32,0.7)" }}
            />
            <GradientButton title="Oluştur" small onPress={generateIdeas} loading={ideasBusy} />
          </View>
          {ideaNote ? <Text className="text-warning text-[11px] mt-2">{ideaNote}</Text> : null}
          {ideas.map((idea) => (
            <View key={idea} className="py-2 border-b border-border">
              <Text className="text-foreground text-[13px]">{idea}</Text>
              <View className="flex-row mt-1">
                <Pressable onPress={() => addEvent(idea)} style={{ marginRight: 16 }}>
                  <Text style={{ color: colors.info, fontSize: 12 }}>+ {WEEK_DAYS[day]} gününe ekle</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setNiche(ideaNiche);
                    setTopic(idea);
                  }}
                >
                  <Text style={{ color: colors.accent, fontSize: 12 }}>Senaryoya çevir</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </Card>

        <Card title="Senaryo Taslakları">
          <Text className="text-sm text-muted mb-1">Niş / Kategori</Text>
          <TextInput
            placeholder="Örn: Teknoloji İncelemesi"
            value={niche}
            onChangeText={setNiche}
            className="p-3 border border-border rounded-xl text-foreground mb-3"
            style={{ backgroundColor: "rgba(13,6,32,0.7)" }}
            placeholderTextColor={colors.muted}
          />
          <Text className="text-sm text-muted mb-1">Video Konusu</Text>
          <TextInput
            placeholder="Örn: iPhone 15 Pro İncelemesi"
            value={topic}
            onChangeText={setTopic}
            className="p-3 border border-border rounded-xl text-foreground mb-3"
            style={{ backgroundColor: "rgba(13,6,32,0.7)" }}
            placeholderTextColor={colors.muted}
          />
          <GradientButton title="Plan Oluştur" onPress={handleGeneratePlan} loading={planBusy} />
        </Card>

        {plan.length > 0 && (
          <View>
            <Text className="text-lg font-semibold text-foreground mb-3">Çekim Planı</Text>
            {planNote ? <Text className="text-muted text-[11px] mb-2">{planNote}</Text> : null}

            {plan.map((p, idx) => (
              <View
                key={idx}
                className="mb-3 p-4 bg-surface rounded-xl border border-border"
              >
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-base font-bold text-foreground">
                    <Text style={{ color: colors.accent }}>{idx + 1}. </Text>
                    {p.phase}
                  </Text>
                  <Text className="text-xs text-muted">{p.time}</Text>
                </View>

                <Text className="text-sm text-muted mb-2">{p.desc}</Text>

                <View className="bg-background p-2 rounded mt-2">
                  <Text className="text-xs text-foreground italic">&ldquo;{p.script}&rdquo;</Text>
                </View>
              </View>
            ))}

            <TouchableOpacity
              onPress={handleExportPDF}
              disabled={isExporting}
              className="p-3 rounded-full mt-2 mb-4 flex-row justify-center items-center gap-1"
              style={{
                backgroundColor: colors.primary,
                opacity: isExporting ? 0.5 : 1,
              }}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-center text-white font-semibold text-sm">Planı PDF İndir</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

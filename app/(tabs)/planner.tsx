import { ScrollView, Text, View, TextInput, TouchableOpacity } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useState } from "react";
import { useColors } from "@/hooks/use-colors";

interface Phase {
  phase: string;
  time: string;
  desc: string;
  script: string;
}

export default function PlannerScreen() {
  const colors = useColors();
  const [niche, setNiche] = useState("");
  const [topic, setTopic] = useState("");
  const [plan, setPlan] = useState<Phase[]>([]);

  const handleGeneratePlan = () => {
    if (!niche.trim() || !topic.trim()) {
      alert("Lütfen niş ve konu girin.");
      return;
    }

    // Generate 6-phase plan
    const newPlan: Phase[] = [
      {
        phase: "Declare",
        time: "0-5s",
        desc: `${niche} dünyasına hızlı giriş. ${topic} hakkında merak uyandırıcı bir soru sor.`,
        script: `Hiç ${topic} konusunu böyle düşünmüş müydünüz?`,
      },
      {
        phase: "Assess",
        time: "5-20s",
        desc: "Mevcut sorunu tanımla. Neden bu videoyu izlemeliler?",
        script: "Çoğu insan bu konuda yanılıyor, işte gerçek...",
      },
      {
        phase: "Isolate",
        time: "20-40s",
        desc: "Çözümü odak noktasına al. Gereksiz detayları ele.",
        script: "Şimdi sadece en önemli kısma odaklanalım.",
      },
      {
        phase: "Process",
        time: "40-120s",
        desc: "Adım adım uygulama. Teknik detayları basitçe anlat.",
        script: "İlk adım olarak şunu yapıyoruz...",
      },
      {
        phase: "Build",
        time: "120-150s",
        desc: "Momentumu artır. Sonuca yaklaştığını hissettir.",
        script: "Ve işte en heyecan verici kısma geliyoruz!",
      },
      {
        phase: "Reveal",
        time: "150s+",
        desc: "Büyük final ve CTA. İzleyiciyi harekete geçir.",
        script: "Sonuç ortada! Siz ne düşünüyorsunuz? Yorumlarda buluşalım.",
      },
    ];

    setPlan(newPlan);
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text className="text-2xl font-bold text-foreground mb-4">🎬 Video Planlayıcı</Text>

        {/* Input Fields */}
        <View className="mb-4">
          <Text className="text-sm text-muted mb-2">Niş / Kategori</Text>
          <TextInput
            placeholder="Örn: Teknoloji İncelemesi"
            value={niche}
            onChangeText={setNiche}
            className="p-3 bg-surface border border-border rounded-lg text-foreground mb-3"
            placeholderTextColor={colors.muted}
          />

          <Text className="text-sm text-muted mb-2">Video Konusu</Text>
          <TextInput
            placeholder="Örn: iPhone 15 Pro İncelemesi"
            value={topic}
            onChangeText={setTopic}
            className="p-3 bg-surface border border-border rounded-lg text-foreground"
            placeholderTextColor={colors.muted}
          />
        </View>

        {/* Generate Button */}
        <TouchableOpacity
          onPress={handleGeneratePlan}
          className="p-4 rounded-lg mb-6"
          style={{ backgroundColor: colors.primary }}
        >
          <Text className="text-center text-background font-semibold">✨ Plan Oluştur</Text>
        </TouchableOpacity>

        {/* Plan Display */}
        {plan.length > 0 && (
          <View>
            <Text className="text-lg font-semibold text-foreground mb-4">📝 Çekim Planı</Text>

            {plan.map((p, idx) => (
              <View
                key={idx}
                className="mb-3 p-4 bg-surface rounded-lg border-l-4"
                style={{ borderLeftColor: colors.primary }}
              >
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-base font-bold text-foreground">{p.phase}</Text>
                  <Text className="text-xs text-muted">{p.time}</Text>
                </View>

                <Text className="text-sm text-muted mb-2">{p.desc}</Text>

                <View className="bg-background p-2 rounded mt-2">
                  <Text className="text-xs text-foreground italic">&quot;{p.script}&quot;</Text>
                </View>
              </View>
            ))}

            {/* Download Button */}
            <TouchableOpacity
              className="p-3 rounded-lg mt-4 mb-4"
              style={{ backgroundColor: colors.primary }}
            >
              <Text className="text-center text-background font-semibold text-sm">📄 Planı PDF İndir</Text>
            </TouchableOpacity>
          </View>
        )}

        {plan.length === 0 && (
          <View className="items-center py-8">
            <Text className="text-muted text-sm">Plan oluşturmak için yukarıdaki formu doldurun</Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

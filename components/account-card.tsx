import { useState } from "react";
import { Alert, Pressable, Text } from "react-native";

import { Field } from "@/components/field";
import { Card, GradientButton } from "@/components/nv";
import { useColors } from "@/hooks/use-colors";
import { useSession } from "@/lib/session";

type Status = { ok: boolean; msg: string } | null;

export function AccountCard() {
  const colors = useColors();
  const { mode, offline, changePassword, deleteAccount } = useSession();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pwStatus, setPwStatus] = useState<Status>(null);
  const [pwBusy, setPwBusy] = useState(false);
  const [delPassword, setDelPassword] = useState("");
  const [delStatus, setDelStatus] = useState<Status>(null);
  const [delBusy, setDelBusy] = useState(false);

  if (mode !== "server") {
    return (
      <Card title="Hesap">
        <Text className="text-muted text-[12px]">
          Sunucu ayarlı değil: hesabın yalnızca bu cihazda tutuluyor. Şifre değiştirme ve hesap silme sunucu bağlıyken kullanılabilir.
        </Text>
      </Card>
    );
  }

  const submitPassword = async () => {
    if (!current) return setPwStatus({ ok: false, msg: "Mevcut şifreyi girin." });
    if (next.length < 8) return setPwStatus({ ok: false, msg: "Yeni şifre en az 8 karakter olmalı." });
    setPwBusy(true);
    setPwStatus(null);
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setPwStatus({ ok: true, msg: "Şifre değişti. Diğer cihazlardaki oturumlar kapatıldı." });
    } catch (e) {
      setPwStatus({ ok: false, msg: (e as Error).message });
    } finally {
      setPwBusy(false);
    }
  };

  const submitDelete = () => {
    if (!delPassword) return setDelStatus({ ok: false, msg: "Silmek için şifreni gir." });
    Alert.alert("Hesabı sil", "Hesabın ve sunucudaki tüm verilerin kalıcı olarak silinir. Bu geri alınamaz.", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Kalıcı olarak sil",
        style: "destructive",
        onPress: async () => {
          setDelBusy(true);
          setDelStatus(null);
          try {
            await deleteAccount(delPassword); // başarılıysa oturum düşer, AuthGate girişe yönlendirir
          } catch (e) {
            setDelStatus({ ok: false, msg: (e as Error).message });
            setDelBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <>
      {offline ? (
        <Card>
          <Text style={{ color: colors.warning, fontSize: 12 }}>
            Sunucuya ulaşılamıyor; önbellekteki profil gösteriliyor. Değişiklikler kaydedilemeyebilir.
          </Text>
        </Card>
      ) : null}

      <Card title="Şifre">
        <Field label="Mevcut şifre" value={current} onChangeText={setCurrent} secure autoCapitalize="none" />
        <Field label="Yeni şifre (en az 8 karakter)" value={next} onChangeText={setNext} secure autoCapitalize="none" />
        <GradientButton title="Şifreyi değiştir" onPress={submitPassword} loading={pwBusy} small />
        {pwStatus ? (
          <Text style={{ color: pwStatus.ok ? colors.success : colors.error, fontSize: 12, marginTop: 8 }}>
            {pwStatus.ok ? "✓ " : "✗ "}
            {pwStatus.msg}
          </Text>
        ) : null}
      </Card>

      <Card title="Hesabı sil">
        <Text className="text-muted text-[12px] mb-2">
          Hesabın ve sunucudaki verilerin kalıcı olarak silinir. API anahtarların yalnızca bu cihazda olduğu için ayrıca silinmez.
        </Text>
        <Field label="Şifren" value={delPassword} onChangeText={setDelPassword} secure autoCapitalize="none" />
        <Pressable
          onPress={submitDelete}
          disabled={delBusy}
          style={{
            borderRadius: 999,
            borderWidth: 1,
            borderColor: colors.error,
            alignItems: "center",
            paddingVertical: 10,
            opacity: delBusy ? 0.5 : 1,
          }}
        >
          <Text style={{ color: colors.error, fontWeight: "700" }}>Hesabı kalıcı sil</Text>
        </Pressable>
        {delStatus ? (
          <Text style={{ color: colors.error, fontSize: 12, marginTop: 8 }}>✗ {delStatus.msg}</Text>
        ) : null}
      </Card>
    </>
  );
}

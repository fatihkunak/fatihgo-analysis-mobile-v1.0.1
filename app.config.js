// app.json'a ek: yalnızca GELİŞTİRME derlemesinde (NICHEVO_ALLOW_CLEARTEXT=1) http'ye izin verir.
// Telefon, `adb reverse tcp:3102 tcp:3102` ile PC'deki yerel sunucuya http://127.0.0.1:3102 üzerinden bağlanır.
// Yayın sürümü bu bayrak OLMADAN derlenmeli (https gerekir).
module.exports = ({ config }) => {
  if (process.env.NICHEVO_ALLOW_CLEARTEXT !== "1") return config;
  return {
    ...config,
    plugins: (config.plugins ?? []).map((p) =>
      Array.isArray(p) && p[0] === "expo-build-properties"
        ? [p[0], { ...p[1], android: { ...p[1].android, usesCleartextTraffic: true } }]
        : p,
    ),
  };
};

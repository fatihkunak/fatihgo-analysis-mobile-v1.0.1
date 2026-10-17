import { configDefaults, defineConfig } from "vitest/config";

// nichevo-backend kendi vitest yapılandırmasıyla (gerçek Postgres gerektirir) ayrıca çalışır
export default defineConfig({
  test: { exclude: [...configDefaults.exclude, "nichevo-backend/**"] },
});

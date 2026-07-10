import { defineConfig } from 'vitest/config'

// Eigene Vitest-Konfiguration (ohne die App-Plugins aus vite.config.ts),
// damit die reinen Logik-Tests in einer schlanken Node-Umgebung laufen.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})

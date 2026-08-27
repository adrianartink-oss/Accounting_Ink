/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** Aktiviert den Zugangscode-Bildschirm ("on"). */
  readonly VITE_ACCESS_GATE?: string
  /** Aktiviert den Claude-Proxy ohne eigenen Nutzer-Key ("on"). */
  readonly VITE_MANAGED_AI?: string
}

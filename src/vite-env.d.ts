/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google Form for the early-access list. Empty = don't show the card. */
  readonly VITE_WAITLIST_URL?: string;
  readonly VITE_PAYMENTS_ENABLED?: string;
  readonly VITE_CF_ANALYTICS_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

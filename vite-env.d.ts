

// Manual definition for Vite environment variables to avoid missing reference error
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

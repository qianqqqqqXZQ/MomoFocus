/// <reference types="vite/client" />
interface Window {
  momoFocusNative?: {
    notify: (payload: { title: string; body: string }) => Promise<boolean>;
  };
}

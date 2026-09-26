/// <reference types="vite/client" />
interface Window {
  momoFocusNative?: {
    onFloatingCommand: (
      listener: (command: "toggleTimer" | "abandonTask") => void,
    ) => () => void;
    notify: (payload: { title: string; body: string }) => Promise<boolean>;
    openFloatingWindow: () => Promise<boolean>;
    closeFloatingWindow: () => Promise<boolean>;
    expandFloatingWindow: () => Promise<boolean>;
    collapseFloatingWindow: () => Promise<boolean>;
    floatingCommand: (command: "toggleTimer" | "abandonTask") => void;
  };
}

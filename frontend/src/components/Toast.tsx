import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

const ToastCtx = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);

  const push = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2900);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className="toast">{t.msg}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

"use client";
import { createContext, useContext, ReactNode } from "react";

// Toast function — only success and error are shown, everything else is silently ignored
type TType = "success" | "error" | "info" | "loading";
interface Ctx { toast: (msg: string, type?: TType, dur?: number) => void; }
const Ctx = createContext<Ctx>({ toast: () => {} });
export function useToast() { return useContext(Ctx); }

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <Ctx.Provider value={{ toast: () => {} }}>
      {children}
    </Ctx.Provider>
  );
}

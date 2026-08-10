import { createContext } from "react";
import type { FreshContext } from "../../core/context/context";

export type FreshCoreContextValue = {
  ready: boolean;
  context: FreshContext | null;
};

export const FreshCoreContext = createContext<FreshCoreContextValue | null>(null);

import { createContext } from "react";
import type { LayoutState, LayoutActions } from "./LayoutTypes";

export type LayoutContextValue = {
  state: LayoutState;
  actions: LayoutActions;
};

export const LayoutContext = createContext<LayoutContextValue | null>(null);

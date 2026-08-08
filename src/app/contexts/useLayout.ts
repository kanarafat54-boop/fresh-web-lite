import { useContext } from "react";
import { LayoutContext } from "./LayoutContextValue";
import type { LayoutState, LayoutActions } from "./LayoutTypes";

export function useLayout(): LayoutState & LayoutActions {
  const value = useContext(LayoutContext);

  if (!value) {
    throw new Error("useLayout must be used inside LayoutProvider");
  }

  return {
    ...value.state,
    ...value.actions,
  };
}

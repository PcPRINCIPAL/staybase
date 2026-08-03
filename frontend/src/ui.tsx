import { createContext, useContext } from "react";

export interface UIActions {
  openWizard: () => void;
}

export const UICtx = createContext<UIActions>({ openWizard: () => {} });
export const useUI = () => useContext(UICtx);

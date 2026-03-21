import { createContext, useContext } from "react";

export type TopbarAction = {
  label: string;
  to?: string;
  onClick?: () => void;
} | null;

export type TopbarActionContextValue = {
  action: TopbarAction;
  setAction: (action: TopbarAction) => void;
};

export const TopbarActionContext =
  createContext<TopbarActionContextValue | null>(null);

export function useTopbarActionContext(): TopbarActionContextValue {
  const ctx = useContext(TopbarActionContext);
  if (!ctx) {
    throw new Error(
      "useTopbarActionContext must be used within TopbarActionContext",
    );
  }
  return ctx;
}

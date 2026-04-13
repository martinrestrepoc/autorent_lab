import { useEffect, useRef } from "react";
import {
  type TopbarAction,
  useTopbarActionContext,
} from "./topbarAction.context";

export function useTopbarAction(action: TopbarAction) {
  const { setAction } = useTopbarActionContext();
  const previousActionRef = useRef<TopbarAction>(null);

  useEffect(() => {
    const previousAction = previousActionRef.current;
    const hasChanged =
      previousAction?.label !== action?.label ||
      previousAction?.to !== action?.to ||
      previousAction?.onClick !== action?.onClick;

    if (hasChanged) {
      previousActionRef.current = action;
      setAction(action);
    }

    return () => {
      previousActionRef.current = null;
      setAction(null);
    };
  }, [action?.label, action?.to, action?.onClick, setAction]);
}

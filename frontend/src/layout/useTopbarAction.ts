import { useEffect, useRef } from "react";
import {
  type TopbarAction,
  useTopbarActionContext,
} from "./topbarAction.context";

export function useTopbarAction(action: TopbarAction) {
  const { setAction } = useTopbarActionContext();
  const previousActionRef = useRef<TopbarAction>(null);
  const label = action?.label;
  const to = action?.to;
  const onClick = action?.onClick;

  useEffect(() => {
    const nextAction = label ? { label, to, onClick } : null;
    const previousAction = previousActionRef.current;
    const hasChanged =
      previousAction?.label !== nextAction?.label ||
      previousAction?.to !== nextAction?.to ||
      previousAction?.onClick !== nextAction?.onClick;

    if (hasChanged) {
      previousActionRef.current = nextAction;
      setAction(nextAction);
    }

    return () => {
      previousActionRef.current = null;
      setAction(null);
    };
  }, [label, to, onClick, setAction]);
}

import { useEffect } from "react";
import {
  type TopbarAction,
  useTopbarActionContext,
} from "./topbarAction.context";

export function useTopbarAction(action: TopbarAction) {
  const { setAction } = useTopbarActionContext();

  useEffect(() => {
    setAction(action);

    return () => {
      setAction(null);
    };
  }, [action, setAction]);
}

import { useEffect } from "react";
import {
  type TopbarAction,
  useTopbarActionContext,
} from "./topbarAction.context";

export function useTopbarAction(action: TopbarAction) {
  const { setAction } = useTopbarActionContext();
  const label = action?.label;
  const to = action?.to;
  const onClick = action?.onClick;

  useEffect(() => {
    setAction(action);

    return () => {
      setAction(null);
    };
  }, [label, to, onClick, setAction]);
}

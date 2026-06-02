import { useState, useEffect, useCallback } from "react";

export function useStore<T>(getter: () => T): T {
  const [data, setData] = useState<T>(getter);

  const refresh = useCallback(() => setData(getter()), [getter]);

  useEffect(() => {
    window.addEventListener("store-updated", refresh);
    return () => window.removeEventListener("store-updated", refresh);
  }, [refresh]);

  return data;
}

import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "../services/http";

type LoadStatus = "loading" | "ready" | "error";

/**
 * Loads a resource through the API facade. `deps` re-triggers the load;
 * `reload` refetches after a mutation without changing the dependency list.
 */
export function useApiResource<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const result = await loaderRef.current();
      setData(result);
      setStatus("ready");
      return result;
    } catch (cause) {
      setError(errorMessage(cause));
      setStatus("error");
      return null;
    }
  }, []);

  useEffect(() => {
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- deps is the caller-provided refresh key
    void reload();
  }, deps);

  return { data, status, error, reload, setData };
}

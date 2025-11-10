import { DependencyList, EffectCallback, useEffect, useRef } from "react";

export function useDebouncedEffect(effect: EffectCallback, deps: DependencyList, delay: number) {
  const cleanupRef = useRef<ReturnType<EffectCallback>>();

  useEffect(() => {
    const handler = setTimeout(() => {
      cleanupRef.current = effect();
    }, delay);

    return () => {
      clearTimeout(handler);
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay]);
}

import { useState, useEffect } from "react";
import { localization } from "@/game/systems/LocalizationManager";

export function useLocalization() {
  const [locale, setLocale] = useState(localization.getLocale());
  // Force update trigger to ensure re-render when translations load
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const unsub = localization.subscribe(() => {
      setLocale(localization.getLocale());
      setTick((t) => t + 1);
    });
    return unsub;
  }, []);

  return {
    t: (key: string, params?: Record<string, string | number>) =>
      localization.t(key, params),
    locale,
  };
}

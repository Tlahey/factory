import { useState, useEffect } from "react";
import { localization } from "@/game/systems/LocalizationManager";

export function useTranslation() {
  const [locale, setLocale] = useState(localization.getLocale());
  const [, setTick] = useState(0); // Force re-render

  useEffect(() => {
    const unsubscribe = localization.subscribe(() => {
      setLocale(localization.getLocale());
      setTick((t) => t + 1);
    });
    return unsubscribe;
  }, []);

  const t = (key: string, params?: Record<string, string | number>) => {
    return localization.t(key, params);
  };

  return {
    t,
    locale,
    setLocale: (l: "en" | "fr") => localization.setLocale(l),
  };
}

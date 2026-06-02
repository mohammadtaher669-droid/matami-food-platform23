import { useState, useCallback } from "react";

export function useTranslate() {
  const [loading, setLoading] = useState(false);

  const translate = useCallback(async (
    text: string,
    from: "en" | "ar",
    to: "en" | "ar"
  ): Promise<string> => {
    if (!text.trim()) return "";
    setLoading(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, from, to }),
      });
      if (!res.ok) throw new Error("Translation failed");
      const data = await res.json();
      return data.translated || text;
    } finally {
      setLoading(false);
    }
  }, []);

  return { translate, loading };
}

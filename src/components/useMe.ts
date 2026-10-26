"use client";
import { useCallback, useEffect, useState } from "react";

export type Me = {
  github: { login: string; avatar: string | null } | null;
  telegram: boolean;
  available: { github: boolean; telegram: string | null };
};

export function useMe() {
  const [me, setMe] = useState<Me | null>(null);
  const refresh = useCallback(async () => {
    const r = await fetch("/api/me", { cache: "no-store" }).catch(() => null);
    if (r?.ok) setMe(await r.json());
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { me, refresh };
}

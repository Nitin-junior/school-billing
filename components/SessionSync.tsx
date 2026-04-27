"use client";

import { useEffect, useRef } from "react";
import { useAuthStore, type Role } from "@/store/useAuthStore";

/**
 * After OAuth redirect the httpOnly cookie is set but Zustand may be empty; sync once.
 */
export default function SessionSync() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { credentials: "include" });
        if (!r.ok) return;
        const d = (await r.json()) as { authenticated?: boolean; name?: string; role?: string; phone?: string };
        if (d.name && d.role && d.phone) {
          setAuth(d.name, d.role as Role, d.phone);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [setAuth]);

  return null;
}

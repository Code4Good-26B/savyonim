"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getDriverRides } from "@/lib/driver/api";
import { getStoredDriverSession } from "@/lib/driver/session";
import type { DriverApiError, DriverRidesResponse, DriverSession } from "@/lib/driver/types";

export function useDriverRides() {
  const router = useRouter();
  const [session, setSession] = useState<DriverSession | null>(null);
  const [hasCheckedSession, setHasCheckedSession] = useState(false);
  const [rides, setRides] = useState<DriverRidesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async (nextSession: DriverSession) => {
    setIsLoading(true);
    setError(null);
    try {
      setRides(await getDriverRides(nextSession));
    } catch (caught) {
      const apiError = caught as DriverApiError;
      if (apiError.redirectTo) {
        router.replace(apiError.redirectTo);
        return;
      }
      setError(apiError.detail ?? "Could not load driver rides.");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSession(getStoredDriverSession());
      setHasCheckedSession(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hasCheckedSession) return;
    if (!session || session.role !== "driver") {
      router.replace("/login");
      return;
    }
    const timer = window.setTimeout(() => {
      void load(session);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [hasCheckedSession, load, router, session]);

  const reload = useCallback(() => {
    if (session) void load(session);
  }, [load, session]);

  return { session, rides, isLoading, error, reload };
}

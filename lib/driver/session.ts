"use client";

import type { DriverSession } from "@/lib/driver/types";

const STORAGE_KEY = "savionim.driverSession";

export function getStoredDriverSession(): DriverSession | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as DriverSession;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function storeDriverSession(session: DriverSession) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearDriverSession() {
  window.localStorage.removeItem(STORAGE_KEY);
}

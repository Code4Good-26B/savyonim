"use client";

import type { RepresentativeSession } from "./types";

const STORAGE_KEY = "savionim.representativeSession";

export function getStoredRepresentativeSession(): RepresentativeSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RepresentativeSession;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function storeRepresentativeSession(session: RepresentativeSession) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearRepresentativeSession() {
  window.localStorage.removeItem(STORAGE_KEY);
}

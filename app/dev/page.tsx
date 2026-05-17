"use client";

import { useEffect, useMemo, useState } from "react";

type RouteCard = {
  title: string;
  endpoint: string;
  ok: boolean;
  statusCode: number | null;
  summary: string;
};

type JsonLike = Record<string, unknown>;

async function fetchRoute(endpoint: string): Promise<RouteCard> {
  try {
    const response = await fetch(endpoint, { cache: "no-store" });
    const text = await response.text();

    let json: JsonLike | null = null;
    try {
      json = JSON.parse(text) as JsonLike;
    } catch {
      json = null;
    }

    const summary =
      json && typeof json.status === "string"
        ? json.status
        : json && typeof json.message === "string"
          ? json.message
          : text.length > 140
            ? `${text.slice(0, 140)}...`
            : text;

    return {
      title: endpoint.replace("/api/", "").toUpperCase(),
      endpoint,
      ok: response.ok,
      statusCode: response.status,
      summary: summary || "No response body",
    };
  } catch (error) {
    return {
      title: endpoint.replace("/api/", "").toUpperCase(),
      endpoint,
      ok: false,
      statusCode: null,
      summary: error instanceof Error ? error.message : "Unknown fetch error",
    };
  }
}

export default function Home() {
  const endpoints = useMemo(
    () => ["/api/ping", "/api/check", "/api/service-zones", "/api/passengers"],
    [],
  );

  const [cards, setCards] = useState<RouteCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      const results = await Promise.all(endpoints.map((endpoint) => fetchRoute(endpoint)));

      if (!isMounted) return;

      setCards(results);
      setLastUpdated(new Date().toLocaleTimeString());
      setIsLoading(false);
    };

    void load();
    const interval = window.setInterval(() => {
      void load();
    }, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [endpoints]);

  const okCount = cards.filter((card) => card.ok).length;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_#0b1320_0%,_#101a2f_35%,_#1b2d4a_70%,_#253f67_100%)] text-white">
      <div className="pointer-events-none absolute -left-32 top-14 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-16 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 sm:px-10">
        <header className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md sm:p-8">
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/80">Savionim Control Surface</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            API Runtime Dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-blue-50/90 sm:text-base">
            This page polls the active API routes and gives you a quick confidence check that the app and
            Supabase wiring are healthy.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/20 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-wide text-blue-100/80">Routes Checked</p>
            <p className="mt-2 text-3xl font-semibold">{endpoints.length}</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-wide text-blue-100/80">Healthy</p>
            <p className="mt-2 text-3xl font-semibold">{isLoading ? "..." : `${okCount}/${cards.length}`}</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-wide text-blue-100/80">Last Update</p>
            <p className="mt-2 text-3xl font-semibold">{lastUpdated || "--:--:--"}</p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {cards.map((card, index) => (
            <article
              key={card.endpoint}
              className="rounded-2xl border border-white/20 bg-white/10 p-5 shadow-[0_10px_40px_-25px_rgba(0,0,0,0.7)] backdrop-blur-sm"
              style={{ animation: `fadeIn 250ms ease ${index * 60}ms both` }}
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{card.title}</h2>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    card.ok
                      ? "bg-emerald-300/20 text-emerald-100 ring-1 ring-emerald-200/30"
                      : "bg-rose-300/20 text-rose-100 ring-1 ring-rose-200/30"
                  }`}
                >
                  {card.ok ? "OK" : "ERROR"}
                </span>
              </div>

              <p className="mt-2 text-sm text-cyan-50/90">{card.endpoint}</p>
              <p className="mt-3 text-sm text-blue-50/95">{card.summary}</p>

              <p className="mt-4 text-xs uppercase tracking-wide text-blue-100/80">
                HTTP {card.statusCode ?? "No response"}
              </p>
            </article>
          ))}
        </section>

        <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </main>
    </div>
  );
}

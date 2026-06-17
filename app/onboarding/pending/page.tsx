export default function OnboardingPendingPage() {
  const eyebrow = "\u05de\u05de\u05ea\u05d9\u05df \u05dc\u05d0\u05d9\u05e9\u05d5\u05e8";
  const title = "\u05e4\u05e8\u05d8\u05d9 \u05d4\u05e0\u05d4\u05d2 \u05e0\u05e9\u05dc\u05d7\u05d5";
  const body = "\u05d4\u05e6\u05d5\u05d5\u05ea \u05d9\u05d1\u05d3\u05d5\u05e7 \u05d0\u05ea \u05d4\u05e4\u05e8\u05d8\u05d9\u05dd \u05d5\u05d0\u05ea \u05e6\u05d9\u05dc\u05d5\u05dd \u05d4\u05e8\u05d9\u05e9\u05d9\u05d5\u05df. \u05e0\u05d9\u05ea\u05df \u05d9\u05d4\u05d9\u05d4 \u05dc\u05d4\u05ea\u05d7\u05d1\u05e8 \u05dc\u05d0\u05d7\u05e8 \u05d0\u05d9\u05e9\u05d5\u05e8 \u05d4\u05d7\u05e9\u05d1\u05d5\u05df.";

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12" dir="rtl">
      <section className="w-full rounded-lg border bg-white p-8 text-right shadow-sm">
        <p className="text-right text-sm font-medium uppercase tracking-wide text-muted-foreground">{eyebrow}</p>
        <h1 className="mt-2 text-right text-2xl font-semibold">{title}</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground" role="status" aria-live="polite">
          {body}
        </p>
      </section>
    </main>
  );
}

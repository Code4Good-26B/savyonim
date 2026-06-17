export default function OnboardingPendingPage() {
  const eyebrow = "Waiting for approval";
  const title = "Registration received";
  const body = "Registration received, waiting for system approval. You will be able to access the app after your account is approved.";

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
      <section className="w-full rounded-lg border bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-semibold">{title}</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground" role="status" aria-live="polite">
          {body}
        </p>
      </section>
    </main>
  );
}

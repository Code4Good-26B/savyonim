export default function OnboardingRejectedPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
      <section className="w-full rounded-lg border border-destructive/30 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-destructive">Registration not approved</p>
        <h1 className="mt-2 text-2xl font-semibold">Account registration was rejected</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground" role="alert">
          Your registration was not approved. Please contact the Savionim team or the person who invited you for the reason and next steps.
        </p>
      </section>
    </main>
  );
}

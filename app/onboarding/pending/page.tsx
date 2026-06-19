export default function OnboardingPendingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12" dir="rtl">
      <section className="w-full rounded-lg border bg-card p-8 shadow-sm text-right">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">ממתין לאישור</p>
        <h1 className="mt-2 text-2xl font-semibold">הרשמה התקבלה</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground" role="status" aria-live="polite">
          הפרטים שלך התקבלו ומועברים לבדיקה. תוכל להיכנס למערכת לאחר שחשבונך יאושר על ידי הנציג האחראי.
        </p>
      </section>
    </main>
  );
}

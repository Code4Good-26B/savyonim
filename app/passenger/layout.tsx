export default function PassengerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-xs uppercase tracking-widest text-gray-400">סביונים</p>
          <h1 className="mt-1 text-xl font-semibold text-gray-900">הזמנת נסיעה</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

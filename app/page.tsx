import Image from "next/image";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col gap-8">

        {/* Logo / Title */}
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-gray-400">ברוכים הבאים</p>
          <Image
            src="/savionim-logo.svg"
            alt="Savionim"
            width={178}
            height={212}
            priority
            className="mx-auto mt-2 h-24 w-auto"
          />
          <p className="mt-2 text-sm text-gray-500">מערכת הסעות מותאמת אישית</p>
        </div>

        {/* Dispatcher login */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col gap-4">
          <div>
            <h2 className="font-semibold text-gray-900">כניסה למערכת</h2>
            <p className="mt-1 text-sm text-gray-500">לדיספצ׳רים</p>
          </div>
          <Link
            href="/dispatcher/dashboard"
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white text-center hover:bg-blue-700 transition-colors"
          >
            דשבורד דיספצ׳ר
          </Link>
        </div>

        {/* Driver */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col gap-4">
          <div>
            <h2 className="font-semibold text-gray-900">פורטל נהגים</h2>
            <p className="mt-1 text-sm text-gray-500">לנהגים בשטח</p>
          </div>
          <Link
            href="/driver"
            className="rounded-lg border border-blue-600 px-4 py-2.5 text-sm font-medium text-blue-600 text-center hover:bg-blue-50 transition-colors"
          >
            כניסה לנהג
          </Link>
        </div>

        {/* Dev shortcuts */}
        <div className="flex flex-col gap-2 border-t border-gray-200 pt-4">
          <p className="text-xs text-center uppercase tracking-wide text-gray-300">קיצורי דרך לפיתוח</p>
          <div className="grid grid-cols-1 gap-2">
            <Link
              href="/dev"
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-500 text-center hover:bg-gray-50"
            >
              API Status
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

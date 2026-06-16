import Image from "next/image";
import Link from "next/link";

const ROLES = [
  {
    title: "מנהל",
    description: "פאנל ניהול וסטטיסטיקות",
    href: "/admin/login",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    accent: "bg-slate-900 text-white hover:bg-slate-800",
    iconBg: "bg-slate-800 text-slate-200",
    border: "border-slate-200",
  },
  {
    title: "נציג",
    description: "לנציגי בתי חולים וקופות חולים",
    href: "/representative/login",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    accent: "bg-blue-600 text-white hover:bg-blue-700",
    iconBg: "bg-blue-100 text-blue-600",
    border: "border-blue-100",
  },
  {
    title: "נהג",
    description: "לנהגים בשטח",
    href: "/driver",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
    accent: "bg-emerald-600 text-white hover:bg-emerald-700",
    iconBg: "bg-emerald-100 text-emerald-600",
    border: "border-emerald-100",
  },
] as const;

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md flex flex-col gap-8">

        <div className="text-center flex flex-col items-center gap-3">
          <Image
            src="/savionim-logo.svg"
            alt="Savionim"
            width={178}
            height={212}
            priority
            className="h-20 w-auto"
          />
          <div>
            <h1 className="text-xl font-semibold text-gray-900">סביונים</h1>
            <p className="text-sm text-gray-500 mt-0.5">מערכת הסעות מותאמת אישית</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 text-center">בחר תפקיד</p>
          {ROLES.map((role) => (
            <Link
              key={role.href}
              href={role.href}
              className={`flex items-center gap-4 rounded-2xl border ${role.border} bg-white p-5 shadow-sm transition-shadow hover:shadow-md group`}
            >
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${role.iconBg}`}>
                {role.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{role.title}</p>
                <p className="text-sm text-gray-500 mt-0.5">{role.description}</p>
              </div>
              <div className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${role.accent}`}>
                כניסה
              </div>
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-gray-200 pt-4">
          <p className="text-xs text-center uppercase tracking-wide text-gray-300">קיצורי דרך לפיתוח</p>
          <Link
            href="/dev"
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-500 text-center hover:bg-gray-50"
          >
            API Status
          </Link>
        </div>

      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { MOCK_SERVICE_ZONES } from "@/lib/mock-data";

export default function NewRequestPage() {
  const [form, setForm] = useState({
    passenger_phone: "",
    source_address: "",
    destination_address: "",
    return_trip_required: false,
    service_zone_id: "",
  });

  const isValid =
    form.passenger_phone.trim() !== "" &&
    form.source_address.trim() !== "" &&
    form.destination_address.trim() !== "" &&
    form.service_zone_id !== "";

  return (
    <div className="max-w-lg flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/dispatcher/requests" className="text-sm text-blue-600 hover:underline">
          ← חזרה לרשימה
        </Link>
      </div>

      <h1 className="text-2xl font-semibold text-gray-900">בקשת נסיעה חדשה</h1>

      <form className="rounded-xl border border-gray-200 bg-white p-6 flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">טלפון נוסע</label>
          <input
            type="tel"
            placeholder="050-0000000"
            value={form.passenger_phone}
            onChange={(e) => setForm({ ...form, passenger_phone: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">כתובת איסוף</label>
          <input
            type="text"
            placeholder="רחוב, עיר"
            value={form.source_address}
            onChange={(e) => setForm({ ...form, source_address: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">כתובת יעד</label>
          <input
            type="text"
            placeholder="רחוב, עיר"
            value={form.destination_address}
            onChange={(e) => setForm({ ...form, destination_address: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="service_zone" className="text-sm font-medium text-gray-700">אזור שירות</label>
          <select
            id="service_zone"
            value={form.service_zone_id}
            onChange={(e) => setForm({ ...form, service_zone_id: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
          >
            <option value="">בחר אזור שירות...</option>
            {MOCK_SERVICE_ZONES.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name} ({zone.region_code})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="return_trip"
            checked={form.return_trip_required}
            onChange={(e) => setForm({ ...form, return_trip_required: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          <label htmlFor="return_trip" className="text-sm text-gray-700">נדרשת נסיעת חזור</label>
        </div>

        <button
          type="submit"
          disabled
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white opacity-50 cursor-not-allowed"
        >
          שלח בקשה
        </button>

        {!isValid && (
          <p className="text-xs text-gray-400">יש למלא את כל השדות לפני השליחה</p>
        )}
      </form>
    </div>
  );
}

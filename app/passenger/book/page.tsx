"use client";

import { useState } from "react";
import { MOCK_SAVED_DESTINATIONS } from "@/lib/mock-data";

const SPECIAL_NOTES_OPTIONS = [
  { id: "wheelchair", label: "כיסא גלגלים" },
  { id: "boarding_help", label: "עזרה בעלייה לרכב" },
  { id: "companion", label: "נסיעה עם מלווה" },
  { id: "oxygen", label: "ציוד רפואי" },
];

type RideTime = "immediate" | "scheduled";

export default function PassengerBookPage() {
  const [form, setForm] = useState({
    source_street: "",
    source_city: "",
    destination_street: "",
    destination_city: "",
    ride_time: "immediate" as RideTime,
    scheduled_at: "",
    return_trip: false,
    special_notes: [] as string[],
    free_text_notes: "",
  });

  const toggleNote = (id: string) => {
    setForm((prev) => ({
      ...prev,
      special_notes: prev.special_notes.includes(id)
        ? prev.special_notes.filter((n) => n !== id)
        : [...prev.special_notes, id],
    }));
  };

  const isValid =
    form.source_street.trim() !== "" &&
    form.source_city.trim() !== "" &&
    form.destination_street.trim() !== "" &&
    form.destination_city.trim() !== "" &&
    (form.ride_time === "immediate" || form.scheduled_at !== "");

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col gap-6">
      <h2 className="font-semibold text-gray-900">פרטי הנסיעה</h2>

      {/* Source */}
      <section className="flex flex-col gap-3">
        <p className="text-sm font-medium text-gray-700">כתובת מוצא</p>
        {MOCK_SAVED_DESTINATIONS.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {MOCK_SAVED_DESTINATIONS.map((dest) => (
              <button
                type="button"
                key={dest.id}
                onClick={() => setForm({ ...form, source_street: dest.street, source_city: dest.city })}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  form.source_street === dest.street && form.source_city === dest.city
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {dest.label}
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="source_street" className="text-xs text-gray-500">רחוב ומספר</label>
            <input
              id="source_street"
              type="text"
              placeholder="רחוב הרצל 5"
              value={form.source_street}
              onChange={(e) => setForm({ ...form, source_street: e.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="source_city" className="text-xs text-gray-500">עיר</label>
            <input
              id="source_city"
              type="text"
              placeholder="תל אביב"
              value={form.source_city}
              onChange={(e) => setForm({ ...form, source_city: e.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {/* Destination */}
      <section className="flex flex-col gap-3">
        <p className="text-sm font-medium text-gray-700">כתובת יעד</p>
        {MOCK_SAVED_DESTINATIONS.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {MOCK_SAVED_DESTINATIONS.map((dest) => (
              <button
                type="button"
                key={dest.id}
                onClick={() => setForm({ ...form, destination_street: dest.street, destination_city: dest.city })}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  form.destination_street === dest.street && form.destination_city === dest.city
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {dest.label}
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="dest_street" className="text-xs text-gray-500">רחוב ומספר</label>
            <input
              id="dest_street"
              type="text"
              placeholder="שדרות רוטשילד 1"
              value={form.destination_street}
              onChange={(e) => setForm({ ...form, destination_street: e.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="dest_city" className="text-xs text-gray-500">עיר</label>
            <input
              id="dest_city"
              type="text"
              placeholder="תל אביב"
              value={form.destination_city}
              onChange={(e) => setForm({ ...form, destination_city: e.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {/* Ride time */}
      <section className="flex flex-col gap-3">
        <p className="text-sm font-medium text-gray-700">מועד הנסיעה</p>
        <div className="flex gap-3">
          <button
            onClick={() => setForm({ ...form, ride_time: "immediate" })}
            className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
              form.ride_time === "immediate"
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            מיידי
          </button>
          <button
            onClick={() => setForm({ ...form, ride_time: "scheduled" })}
            className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
              form.ride_time === "scheduled"
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            עתידי
          </button>
        </div>

        {form.ride_time === "scheduled" && (
          <div className="flex flex-col gap-1">
            <label htmlFor="scheduled_at" className="text-xs text-gray-500">תאריך ושעה</label>
            <input
              id="scheduled_at"
              type="datetime-local"
              value={form.scheduled_at}
              onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            id="return_trip"
            type="checkbox"
            checked={form.return_trip}
            onChange={(e) => setForm({ ...form, return_trip: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          <label htmlFor="return_trip" className="text-sm text-gray-700">נסיעת הלוך-חזור</label>
        </div>
      </section>

      {/* Special notes */}
      <section className="flex flex-col gap-3">
        <p className="text-sm font-medium text-gray-700">הערות מיוחדות</p>
        <div className="grid grid-cols-2 gap-2">
          {SPECIAL_NOTES_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => toggleNote(option.id)}
              className={`rounded-lg border px-3 py-2 text-sm text-right transition-colors ${
                form.special_notes.includes(option.id)
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="free_notes" className="text-xs text-gray-500">הערה חופשית</label>
          <textarea
            id="free_notes"
            rows={2}
            placeholder="הערות נוספות לנהג..."
            value={form.free_text_notes}
            onChange={(e) => setForm({ ...form, free_text_notes: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
          />
        </div>
      </section>

      <button
        disabled={!isValid}
        className={`rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors ${
          isValid ? "bg-blue-600 hover:bg-blue-700 cursor-pointer" : "bg-blue-600 opacity-50 cursor-not-allowed"
        }`}
      >
        שלח בקשת נסיעה
      </button>
    </div>
  );
}

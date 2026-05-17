"use client";

import Link from "next/link";
import { useState } from "react";
import {
  MOCK_PAST_RIDES,
  MOCK_SAVED_DESTINATIONS,
  type SavedDestination,
  type RideStatus,
} from "@/lib/mock-data";

const MOCK_CURRENT_PASSENGER = {
  full_name: "מרים כץ",
  phone: "050-1111111",
  email: "miriam@example.com",
  national_id: "111111111",
  category: "קשיש",
  mobility_need: "walker",
  emergency_contact: "050-9991111",
};

const STATUS_LABEL: Record<RideStatus, string> = {
  pending: "ממתין",
  approved: "מאושר",
  waiting_for_representitive: "ממתין לנציג",
  in_progress: "בדרך",
  completed: "הושלם",
  rejected: "נדחה",
};

const STATUS_COLOR: Record<RideStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  waiting_for_representitive: "bg-purple-100 text-purple-800",
  in_progress: "bg-cyan-100 text-cyan-800",
  completed: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const DESTINATION_ICONS: Record<string, string> = {
  בית: "🏠",
  עבודה: "💼",
};

export default function PassengerProfilePage() {
  const [destinations, setDestinations] = useState<SavedDestination[]>(MOCK_SAVED_DESTINATIONS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDest, setNewDest] = useState({ label: "", street: "", city: "" });

  const addDestination = () => {
    if (!newDest.label.trim() || !newDest.street.trim() || !newDest.city.trim()) return;
    setDestinations((prev) => [
      ...prev,
      { id: `d${Date.now()}`, ...newDest },
    ]);
    setNewDest({ label: "", street: "", city: "" });
    setShowAddForm(false);
  };

  const removeDestination = (id: string) => {
    setDestinations((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="mx-auto max-w-2xl flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-400">סביונים</p>
            <h1 className="mt-1 text-xl font-semibold text-gray-900">האזור האישי שלי</h1>
          </div>
          <Link
            href="/passenger/book"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + הזמן נסיעה
          </Link>
        </div>

        {/* Personal details */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">הפרטים שלי</h2>
            <button type="button" disabled className="text-sm text-blue-600 opacity-40 cursor-not-allowed">
              עריכה
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">שם מלא</p>
              <p className="mt-1 font-medium text-gray-900">{MOCK_CURRENT_PASSENGER.full_name}</p>
            </div>
            <div>
              <p className="text-gray-400">טלפון</p>
              <p className="mt-1 text-gray-900">{MOCK_CURRENT_PASSENGER.phone}</p>
            </div>
            <div>
              <p className="text-gray-400">אימייל</p>
              <p className="mt-1 text-gray-900">{MOCK_CURRENT_PASSENGER.email}</p>
            </div>
            <div>
              <p className="text-gray-400">תעודת זהות</p>
              <p className="mt-1 text-gray-900">{MOCK_CURRENT_PASSENGER.national_id}</p>
            </div>
            <div>
              <p className="text-gray-400">קטגוריה</p>
              <p className="mt-1 text-gray-900">{MOCK_CURRENT_PASSENGER.category}</p>
            </div>
            <div>
              <p className="text-gray-400">צורך ניידות</p>
              <p className="mt-1 text-gray-900">{MOCK_CURRENT_PASSENGER.mobility_need}</p>
            </div>
            <div>
              <p className="text-gray-400">איש קשר לחירום</p>
              <p className="mt-1 text-gray-900">{MOCK_CURRENT_PASSENGER.emergency_contact}</p>
            </div>
          </div>
        </section>

        {/* Saved destinations */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">יעדים שמורים</h2>
            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className="text-sm text-blue-600 hover:underline"
            >
              {showAddForm ? "ביטול" : "+ הוסף יעד"}
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {destinations.map((dest) => (
              <div
                key={dest.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{DESTINATION_ICONS[dest.label] ?? "📍"}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{dest.label}</p>
                    <p className="text-xs text-gray-500">{dest.street}, {dest.city}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeDestination(dest.id)}
                  className="text-xs text-gray-400 hover:text-red-500"
                >
                  הסר
                </button>
              </div>
            ))}

            {destinations.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">אין יעדים שמורים עדיין</p>
            )}
          </div>

          {showAddForm && (
            <div className="flex flex-col gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-medium text-gray-700">יעד חדש</p>
              <input
                type="text"
                placeholder="תווית (בית, עבודה, מרפאה...)"
                value={newDest.label}
                onChange={(e) => setNewDest({ ...newDest, label: e.target.value })}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="רחוב ומספר"
                  value={newDest.street}
                  onChange={(e) => setNewDest({ ...newDest, street: e.target.value })}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                />
                <input
                  type="text"
                  placeholder="עיר"
                  value={newDest.city}
                  onChange={(e) => setNewDest({ ...newDest, city: e.target.value })}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>
              <button
                type="button"
                onClick={addDestination}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                שמור יעד
              </button>
            </div>
          )}
        </section>

        {/* Past rides */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 flex flex-col gap-4">
          <h2 className="font-semibold text-gray-900">היסטוריית נסיעות</h2>

          {MOCK_PAST_RIDES.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">אין נסיעות קודמות</p>
          ) : (
            <div className="flex flex-col divide-y divide-gray-100">
              {MOCK_PAST_RIDES.map((ride) => (
                <div key={ride.id} className="py-4 flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1 text-sm">
                    <p className="text-xs text-gray-400">
                      {new Date(ride.date).toLocaleDateString("he-IL", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium text-gray-900">מ:</span> {ride.source}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium text-gray-900">ל:</span> {ride.destination}
                    </p>
                    {ride.driver_name && (
                      <p className="text-xs text-gray-400">נהג: {ride.driver_name}</p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[ride.status]}`}>
                    {STATUS_LABEL[ride.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

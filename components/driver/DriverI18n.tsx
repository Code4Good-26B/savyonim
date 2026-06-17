"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type DriverLanguage = "en" | "he";

const STORAGE_KEY = "savionim.driverLanguage";

const translations = {
  en: {
    appName: "Driver app",
    savionim: "Savionim",
    backToHomepage: "Back to homepage",
    languageLabel: "Switch language",
    login: "Log in",
    loginPending: "Logging in...",
    logout: "Log out",
    signup: "Sign Up",
    signIn: "Sign in",
    landingEyebrow: "Savionim drivers",
    landingTitle: "Drive care where it is needed most.",
    landingBody:
      "Join the driver platform to review assigned rides, see open requests in your service zone, and keep every transport moving with clear status updates.",
    landingCapabilityTitle: "After joining, drivers can",
    manageActiveRides: "Manage active rides",
    manageActiveRidesBody: "View assigned pickups and update ride progress.",
    claimNearbyRequests: "Claim nearby requests",
    claimNearbyRequestsBody: "Find open rides matched to your service zone.",
    stayCoordinated: "Stay coordinated",
    stayCoordinatedBody: "Keep dispatch and care teams aligned in real time.",
    loginTitle: "Log in",
    loginBody: "Use a registered driver account to view and manage rides.",
    loginFailed: "Login failed",
    email: "Email",
    password: "Password",
    needAccount: "Need a driver account?",
    inviteOnlyAccount: "Driver accounts are created by invitation from a manager or representative.",
    registerTitle: "Register driver",
    registerBody:
      "Creates a local driver account and profile. Leave service zone empty if the team has not assigned one yet.",
    registrationFailed: "Registration failed",
    fullName: "Full name",
    phone: "Phone",
    serviceZoneId: "Service zone ID",
    optionalServiceZone: "Optional service zone UUID",
    createDriverPending: "Creating driver...",
    createDriverAccount: "Create driver account",
    alreadyRegistered: "Already registered?",
    currentWork: "Current work",
    currentWorkBody: "Review rides assigned to you and open rides in your service zone.",
    assignedToYou: "Assigned to you",
    noAssignedRides: "No assigned rides",
    noAssignedRidesBody: "You do not have an active assigned ride.",
    openRides: "Open rides",
    noOpenRides: "No open rides",
    noOpenRidesBody: "There are no open rides in your service zone right now.",
    rideHistory: "Ride History",
    noRideHistory: "No ride history yet.",
    loadingRides: "Loading rides",
    loadingRidesBody: "Fetching your assigned, open, and past rides...",
    couldNotLoadRides: "Could not load rides",
    retry: "Retry",
    openRide: "Open ride",
    yourRide: "Your ride",
    pastRide: "Past ride",
    from: "From:",
    to: "To:",
    viewDetails: "View details",
    continueRide: "Continue ride",
    pickupTimeNotSet: "Pickup time not set",
    sourceUnavailable: "Source address unavailable",
    destinationUnavailable: "Destination unavailable",
    checkingSession: "Checking driver session...",
    backToDashboard: "Back to dashboard",
    rideDetails: "Ride details",
    passengerInfo: "Passenger information",
    passengerName: "Passenger:",
    passengerPhone: "Phone:",
    passengerEmergencyContact: "Emergency contact:",
    passengerMobility: "Mobility:",
    passengerCategory: "Category:",
    passengerUnavailable: "Passenger information is not available for this ride.",
    pickupNotes: "Pickup notes:",
    dropoffNotes: "Dropoff notes:",
    returnTrip: "Return trip:",
    yes: "Yes",
    no: "No",
    pickupTime: "Pickup time:",
    notSet: "Not set",
    loadingRide: "Loading ride",
    loadingRideBody: "Fetching latest ride data...",
    couldNotLoadRide: "Could not load ride",
    couldNotTakeRide: "Could not take ride",
    takingRide: "Taking ride...",
    takeRide: "Take ride",
    actionFailed: "Action failed",
    startRidePending: "Starting...",
    startRide: "Start ride",
    completeRide: "Complete ride",
    odometerStart: "Odometer start",
    odometerEnd: "Odometer end",
    completeRidePending: "Completing...",
    rejectCancelReason: "Reject/cancel reason",
    rejectRidePending: "Rejecting...",
    rejectRide: "Reject ride",
    odometerStartNumber: "Odometer start must be a number.",
    odometerEndNumber: "Odometer end must be a number.",
    odometerEndGreater: "Odometer end must be greater than or equal to odometer start.",
    statusAssigned: "assigned",
    statusInProgress: "in progress",
    statusCompleted: "completed",
    statusRejected: "rejected",
    statusApproved: "approved",
  },
  he: {
    appName: "אפליקציית נהגים",
    savionim: "סביונים",
    backToHomepage: "חזרה לדף הבית",
    languageLabel: "החלפת שפה",
    login: "כניסה",
    loginPending: "מתחבר...",
    logout: "יציאה",
    signup: "הרשמה",
    signIn: "כניסה",
    landingEyebrow: "נהגי סביונים",
    landingTitle: "מסיעים עזרה בדיוק למי שצריך.",
    landingBody:
      "הצטרפו למערכת הנהגים כדי לראות נסיעות משויכות, בקשות פתוחות באזור השירות, ולעדכן סטטוסים בצורה ברורה.",
    landingCapabilityTitle: "אחרי ההצטרפות, נהגים יכולים",
    manageActiveRides: "לנהל נסיעות פעילות",
    manageActiveRidesBody: "לראות איסופים משויכים ולעדכן את התקדמות הנסיעה.",
    claimNearbyRequests: "לקחת בקשות קרובות",
    claimNearbyRequestsBody: "למצוא נסיעות פתוחות שמתאימות לאזור השירות שלך.",
    stayCoordinated: "להישאר מתואמים",
    stayCoordinatedBody: "לעדכן את המוקד והצוותים בזמן אמת.",
    loginTitle: "כניסה",
    loginBody: "התחברו עם חשבון נהג רשום כדי לראות ולנהל נסיעות.",
    loginFailed: "הכניסה נכשלה",
    email: "אימייל",
    password: "סיסמה",
    needAccount: "צריך חשבון נהג?",
    inviteOnlyAccount: "\u05d7\u05e9\u05d1\u05d5\u05e0\u05d5\u05ea \u05e0\u05d4\u05d2\u05d9\u05dd \u05e0\u05e4\u05ea\u05d7\u05d9\u05dd \u05e8\u05e7 \u05d1\u05d0\u05de\u05e6\u05e2\u05d5\u05ea \u05d4\u05d6\u05de\u05e0\u05d4 \u05de\u05de\u05e0\u05d4\u05dc \u05d0\u05d5 \u05de\u05e0\u05e6\u05d9\u05d2.",
    registerTitle: "הרשמת נהג",
    registerBody: "יוצר חשבון נהג מקומי ופרופיל. אפשר להשאיר אזור שירות ריק אם עדיין לא שובצת.",
    registrationFailed: "ההרשמה נכשלה",
    fullName: "שם מלא",
    phone: "טלפון",
    serviceZoneId: "מזהה אזור שירות",
    optionalServiceZone: "UUID אופציונלי של אזור שירות",
    createDriverPending: "יוצר נהג...",
    createDriverAccount: "יצירת חשבון נהג",
    alreadyRegistered: "כבר רשומים?",
    currentWork: "עבודה נוכחית",
    currentWorkBody: "סקירת נסיעות ששויכו אליך ונסיעות פתוחות באזור השירות שלך.",
    assignedToYou: "משויכות אליך",
    noAssignedRides: "אין נסיעות משויכות",
    noAssignedRidesBody: "אין לך נסיעה פעילה שמשויכת אליך.",
    openRides: "נסיעות פתוחות",
    noOpenRides: "אין נסיעות פתוחות",
    noOpenRidesBody: "אין כרגע נסיעות פתוחות באזור השירות שלך.",
    rideHistory: "היסטוריית נסיעות",
    noRideHistory: "עדיין אין היסטוריית נסיעות.",
    loadingRides: "טוען נסיעות",
    loadingRidesBody: "מביא נסיעות משויכות, פתוחות והיסטוריה...",
    couldNotLoadRides: "לא ניתן לטעון נסיעות",
    retry: "נסה שוב",
    openRide: "נסיעה פתוחה",
    yourRide: "הנסיעה שלך",
    pastRide: "נסיעה קודמת",
    from: "מ:",
    to: "אל:",
    viewDetails: "צפייה בפרטים",
    continueRide: "המשך נסיעה",
    pickupTimeNotSet: "זמן איסוף לא נקבע",
    sourceUnavailable: "כתובת מוצא לא זמינה",
    destinationUnavailable: "יעד לא זמין",
    checkingSession: "בודק התחברות נהג...",
    backToDashboard: "חזרה לדשבורד",
    rideDetails: "פרטי נסיעה",
    passengerInfo: "Passenger information",
    passengerName: "Passenger:",
    passengerPhone: "Phone:",
    passengerEmergencyContact: "Emergency contact:",
    passengerMobility: "Mobility:",
    passengerCategory: "Category:",
    passengerUnavailable: "Passenger information is not available for this ride.",
    pickupNotes: "הערות איסוף:",
    dropoffNotes: "הערות יעד:",
    returnTrip: "נסיעת חזור:",
    yes: "כן",
    no: "לא",
    pickupTime: "זמן איסוף:",
    notSet: "לא נקבע",
    loadingRide: "טוען נסיעה",
    loadingRideBody: "מביא את נתוני הנסיעה האחרונים...",
    couldNotLoadRide: "לא ניתן לטעון נסיעה",
    couldNotTakeRide: "לא ניתן לקחת נסיעה",
    takingRide: "לוקח נסיעה...",
    takeRide: "לקיחת נסיעה",
    actionFailed: "הפעולה נכשלה",
    startRidePending: "מתחיל...",
    startRide: "התחלת נסיעה",
    completeRide: "סיום נסיעה",
    odometerStart: "מד קילומטרים בתחילה",
    odometerEnd: "מד קילומטרים בסיום",
    completeRidePending: "מסיים...",
    rejectCancelReason: "סיבת דחייה/ביטול",
    rejectRidePending: "דוחה...",
    rejectRide: "דחיית נסיעה",
    odometerStartNumber: "מד קילומטרים בתחילה חייב להיות מספר.",
    odometerEndNumber: "מד קילומטרים בסיום חייב להיות מספר.",
    odometerEndGreater: "מד הסיום חייב להיות גדול או שווה למד ההתחלה.",
    statusAssigned: "משויכת",
    statusInProgress: "בתהליך",
    statusCompleted: "הושלמה",
    statusRejected: "נדחתה",
    statusApproved: "מאושרת",
  },
} as const;

export type DriverTranslationKey = keyof typeof translations.en;

type DriverI18nValue = {
  language: DriverLanguage;
  direction: "ltr" | "rtl";
  setLanguage: (language: DriverLanguage) => void;
  toggleLanguage: () => void;
  t: (key: DriverTranslationKey) => string;
};

const DriverI18nContext = createContext<DriverI18nValue | null>(null);

function readStoredLanguage(): DriverLanguage {
  return window.localStorage.getItem(STORAGE_KEY) === "he" ? "he" : "en";
}

export function DriverI18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<DriverLanguage>("en");
  const [hasHydrated, setHasHydrated] = useState(false);
  const direction = language === "he" ? "rtl" : "ltr";

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLanguageState(readStoredLanguage());
      setHasHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
  }, [direction, hasHydrated, language]);

  const value = useMemo<DriverI18nValue>(
    () => ({
      language,
      direction,
      setLanguage: setLanguageState,
      toggleLanguage: () => setLanguageState((current) => (current === "en" ? "he" : "en")),
      t: (key) => translations[language][key],
    }),
    [direction, language],
  );

  return <DriverI18nContext.Provider value={value}>{children}</DriverI18nContext.Provider>;
}

export function useDriverI18n() {
  const value = useContext(DriverI18nContext);
  if (!value) throw new Error("useDriverI18n must be used inside DriverI18nProvider");
  return value;
}

export function LanguageSwitch({ className = "" }: { className?: string }) {
  const { language, toggleLanguage, t } = useDriverI18n();
  const nextLanguage = language === "en" ? "עב" : "EN";

  return (
    <button
      type="button"
      aria-label={t("languageLabel")}
      title={t("languageLabel")}
      onClick={toggleLanguage}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-sm font-bold text-slate-800 shadow-sm transition hover:border-blue-300 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${className}`}
    >
      {nextLanguage}
    </button>
  );
}

export function translateStatus(status: string, t: (key: DriverTranslationKey) => string) {
  if (status === "assigned") return t("statusAssigned");
  if (status === "in_progress") return t("statusInProgress");
  if (status === "completed") return t("statusCompleted");
  if (status === "rejected") return t("statusRejected");
  if (status === "approved") return t("statusApproved");
  return status.replaceAll("_", " ");
}

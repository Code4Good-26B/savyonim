import Link from "next/link";
import { Clock, MapPin, Phone, Navigation, CheckCircle2, XCircle, Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type OpenRideCardData = {
  id: string;
  passenger: string;
  phone: string | null;
  pickup: string;
  dropoff: string;
  time: string;
};

export type FutureRideCardData = OpenRideCardData & { status: string };

export type HistoryRideCardData = {
  id: string;
  passenger: string;
  meta: string;
  pickup: string;
  dropoff: string;
  completed: boolean;
};

/** Shared empty-state notice used when a section has no rides. */
export function EmptyNotice({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <Inbox className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{children}</p>
      </CardContent>
    </Card>
  );
}

function PassengerHeader({
  passenger,
  phone,
  dot,
  badge,
}: {
  passenger: string;
  phone: string | null;
  dot: string;
  badge: React.ReactNode;
}) {
  return (
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${dot}`} />
          <div className="text-right">
            <CardTitle className="text-base">{passenger}</CardTitle>
            {phone ? (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <a href={`tel:${phone}`} className="hover:underline" dir="ltr">
                  {phone}
                </a>
                <Phone className="h-3 w-3" />
              </div>
            ) : null}
          </div>
        </div>
        {badge}
      </div>
    </CardHeader>
  );
}

function RouteRows({ pickup, dropoff }: { pickup: string; dropoff: string }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-start gap-2">
        <MapPin className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 text-right">
          <p className="text-sm font-medium">איסוף</p>
          <p className="text-sm text-muted-foreground">{pickup}</p>
        </div>
      </div>
      <div className="flex items-start gap-2">
        <MapPin className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 text-right">
          <p className="text-sm font-medium">יעד</p>
          <p className="text-sm text-muted-foreground">{dropoff}</p>
        </div>
      </div>
    </div>
  );
}

export function OpenRideCard({ ride }: { ride: OpenRideCardData }) {
  return (
    <Card>
      <PassengerHeader
        passenger={ride.passenger}
        phone={ride.phone}
        dot="bg-orange-500"
        badge={<Badge variant="secondary">פתוחה</Badge>}
      />
      <CardContent className="space-y-3">
        <RouteRows pickup={ride.pickup} dropoff={ride.dropoff} />
        <div className="flex items-center justify-end gap-1 pt-2 border-t border-border text-sm text-muted-foreground">
          <span>{ride.time}</span>
          <Clock className="h-4 w-4" />
        </div>
        <Button asChild variant="outline" className="w-full" size="sm">
          <Link href={`/driver/rides/${ride.id}`}>צפה בפרטים וקבל</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function FutureRideCard({ ride }: { ride: FutureRideCardData }) {
  const dot = ride.status === "in_progress" ? "bg-blue-500" : "bg-yellow-500";
  const label = ride.status === "in_progress" ? "בביצוע" : "משובץ";

  return (
    <Card>
      <PassengerHeader
        passenger={ride.passenger}
        phone={ride.phone}
        dot={dot}
        badge={<Badge variant="default">{label}</Badge>}
      />
      <CardContent className="space-y-3">
        <RouteRows pickup={ride.pickup} dropoff={ride.dropoff} />
        <div className="flex items-center justify-end gap-1 pt-2 border-t border-border text-sm text-muted-foreground">
          <span>{ride.time}</span>
          <Clock className="h-4 w-4" />
        </div>
        <Button asChild className="w-full gap-2" size="sm">
          <Link href={`/driver/rides/${ride.id}`}>
            <Navigation className="h-4 w-4" />
            המשך הסעה
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function HistoryRideCard({ ride }: { ride: HistoryRideCardData }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="text-right">
            <p className="font-medium">{ride.passenger}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{ride.meta}</p>
          </div>
          <Badge variant={ride.completed ? "default" : "secondary"} className="gap-1">
            {ride.completed ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            {ride.completed ? "הושלמה" : "בוטלה"}
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground text-right">
          {ride.pickup} ← {ride.dropoff}
        </div>
      </CardContent>
    </Card>
  );
}

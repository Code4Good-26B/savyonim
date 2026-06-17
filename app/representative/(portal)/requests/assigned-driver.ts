export type RideDriver = {
  status: string;
  drivers: { users: { full_name: string }[] }[] | { users: { full_name: string } | null } | null;
};

export function assignedDriver(rides: RideDriver[]): string {
  const active = rides.find((r) => r.status === "assigned" || r.status === "in_progress");
  if (!active?.drivers) return "—";
  const drv = Array.isArray(active.drivers) ? active.drivers[0] : active.drivers;
  if (!drv?.users) return "—";
  const usr = Array.isArray(drv.users) ? drv.users[0] : drv.users;
  return usr?.full_name ?? "—";
}

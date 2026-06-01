type NoticeKind = "error" | "info" | "success";

const styles: Record<NoticeKind, string> = {
  error: "border-red-200 bg-red-50 text-red-900",
  info: "border-blue-200 bg-blue-50 text-blue-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
};

export function DriverNotice({
  title,
  children,
  kind = "info",
}: {
  title: string;
  children?: React.ReactNode;
  kind?: NoticeKind;
}) {
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${styles[kind]}`}>
      <p className="text-sm font-semibold">{title}</p>
      {children ? <div className="mt-2 text-sm leading-6">{children}</div> : null}
    </div>
  );
}

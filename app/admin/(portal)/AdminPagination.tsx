"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export function AdminPagination({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function buildUrl(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    return `${pathname}?${params.toString()}`;
  }

  return (
    <div className="flex items-center justify-between border-t border-border pt-4 mt-4 px-6">
      <p className="text-xs text-muted-foreground">
        עמוד {page} מתוך {totalPages}
      </p>
      <div className="flex gap-2">
        {page > 1 && (
          <Button asChild variant="outline" size="sm">
            <Link href={buildUrl(page - 1)}>← הקודם</Link>
          </Button>
        )}
        {page < totalPages && (
          <Button asChild variant="outline" size="sm">
            <Link href={buildUrl(page + 1)}>הבא →</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

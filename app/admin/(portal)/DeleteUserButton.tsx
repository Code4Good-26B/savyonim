"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteUser } from "./actions";

export function DeleteUserButton({
  userId,
  name,
  pathToRevalidate,
}: {
  userId: string;
  name: string;
  pathToRevalidate: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteUser(userId, pathToRevalidate);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`${name} הוסר בהצלחה`);
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={isPending}
          className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>הסרת משתמש</AlertDialogTitle>
          <AlertDialogDescription>
            אתה בטוח שאתה רוצה להסיר את המשתמש{" "}
            <span className="font-semibold text-foreground">{name}</span>?
            <br />
            פעולה זו אינה הפיכה.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel>ביטול</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isPending ? "מסיר..." : "הסר משתמש"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

import { redirect } from "next/navigation";

export default function LoginDriverPage() {
  // Consolidated: drivers log in via the main login page (/) using the role selector.
  redirect("/");
}

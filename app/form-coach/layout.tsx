import { ReactNode } from "react";

import { requireAuth } from "@/lib/auth";

export default async function FormCoachLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAuth();

  return children;
}
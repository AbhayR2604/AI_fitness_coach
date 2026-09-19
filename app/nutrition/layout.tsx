import { ReactNode } from "react";

import { requireAuth } from "@/lib/auth";

export default async function NutritionLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAuth();

  return children;
}

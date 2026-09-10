import { requireAuth } from "@/lib/auth";

export default async function WorkoutsLayout({ children }: LayoutProps<"/workouts">) {
  await requireAuth();
  return children;
}

import { requireAuth } from "@/lib/auth";

export default async function HabitsLayout({ children }: LayoutProps<"/habits">) {
  await requireAuth();
  return children;
}

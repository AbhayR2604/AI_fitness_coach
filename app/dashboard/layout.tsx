import { requireAuth } from "@/lib/auth";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  await requireAuth();
  return children;
}

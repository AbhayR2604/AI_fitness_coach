import { requireAuth } from "@/lib/auth";

export default async function SettingsLayout({ children }: LayoutProps<"/settings">) {
  await requireAuth();
  return children;
}

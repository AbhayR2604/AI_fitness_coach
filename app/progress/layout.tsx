import { requireAuth } from "@/lib/auth";

export default async function ProgressLayout({ children }: LayoutProps<"/progress">) {
  await requireAuth();
  return children;
}

import { requireAuth } from "@/lib/auth";

export default async function OnboardingLayout({ children }: LayoutProps<"/onboarding">) {
  await requireAuth();
  return children;
}

"use client";

import {
  Activity,
  Camera,
  Dumbbell,
  LogOut,
  Menu,
  Utensils,
  X,
} from "lucide-react";

import Link from "next/link";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  ReactNode,
  useEffect,
  useState,
} from "react";

import {
  createSupabaseBrowserClient,
} from "@/lib/supabase/client";

const nav = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: Activity,
  },
  {
    href: "/workouts",
    label: "Workouts",
    icon: Dumbbell,
  },
  {
    href: "/nutrition",
    label: "AI Nutrition",
    icon: Utensils,
  },
  {
    href: "/form-coach",
    label: "Form Coach",
    icon: Camera,
  },
];

export function AppShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const [open, setOpen] =
    useState(false);

  const [
    profileName,
    setProfileName,
  ] = useState("User");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const supabase =
          createSupabaseBrowserClient();

        const {
          data: { user },
        } =
          await supabase.auth.getUser();

        if (!user) {
          return;
        }

        const {
          data: profile,
        } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();

        if (
          active &&
          profile?.full_name
        ) {
          setProfileName(
            profile.full_name
          );
        }
      } catch {
        /*
         * Keep fallback name if
         * profile loading fails.
         */
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    try {
      const supabase =
        createSupabaseBrowserClient();

      const { error } =
        await supabase.auth.signOut();

      if (error) {
        console.error(
          "Supabase logout failed",
          error
        );

        return;
      }

      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error(
        "Supabase logout failed",
        error
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f8f4]">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[#e2e9e2] bg-[#fbfcfa] p-6 transition-transform lg:translate-x-0 ${
          open
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            onClick={() =>
              setOpen(false)
            }
            className="flex items-center gap-3"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#174b39] text-[#c9f36d]">
              <Activity
                size={20}
              />
            </span>

            <span className="text-sm font-bold tracking-tight">
              AI FITNESS{" "}
              <span className="text-[#86a63b]">
                COACH
              </span>
            </span>
          </Link>

          <button
            type="button"
            className="lg:hidden"
            onClick={() =>
              setOpen(false)
            }
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-12 space-y-1">
          {nav.map(
            ({
              href,
              label,
              icon: Icon,
            }) => {
              const active =
                pathname ===
                  href ||
                pathname.startsWith(
                  `${href}/`
                );

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() =>
                    setOpen(false)
                  }
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-[#e7f3d0] text-[#174b39]"
                      : "text-[#7c8880] hover:bg-[#f0f4ed] hover:text-[#174b39]"
                  }`}
                >
                  <Icon
                    size={18}
                  />

                  {label}
                </Link>
              );
            }
          )}
        </nav>

        {/* User profile */}
        <div className="mt-auto border-t border-[#e2e9e2] pt-5">
          <div className="flex items-center gap-3 rounded-xl p-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#d8e8cf] text-sm font-bold text-[#174b39]">
              {profileName
                .charAt(0)
                .toUpperCase()}
            </span>

            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">
                {profileName}
              </span>

              <span className="block text-xs text-[#8a968d]">
                Fitness profile
              </span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              void handleLogout();
            }}
            className="mt-4 flex w-full items-center gap-3 px-2 text-xs font-semibold text-[#8a968d] hover:text-[#174b39]"
          >
            <LogOut
              size={16}
            />

            Log out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="flex h-16 items-center justify-between border-b border-[#e2e9e2] bg-[#fbfcfa] px-5 lg:hidden">
          <button
            type="button"
            onClick={() =>
              setOpen(true)
            }
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          <Link
            href="/dashboard"
            className="text-sm font-bold tracking-tight"
          >
            AI FITNESS{" "}
            <span className="text-[#86a63b]">
              COACH
            </span>
          </Link>

          <Link
            href="/dashboard"
            className="h-8 w-8 rounded-full bg-[#d8e8cf] text-center text-sm font-bold leading-8 text-[#174b39]"
          >
            {profileName
              .charAt(0)
              .toUpperCase()}
          </Link>
        </header>

        {/* Page content */}
        <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
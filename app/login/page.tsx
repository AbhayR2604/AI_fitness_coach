"use client";

import Link from "next/link";
import { Activity, ArrowRight } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { PrimaryButton } from "@/components/ui";

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const formData = new FormData(event.currentTarget);
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: String(formData.get("email")),
        password: String(formData.get("password")),
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("We could not verify your session. Please try again.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("fitness_goal, experience_level, training_days, session_length")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError) {
        setError("We could not load your profile. Please try again.");
        return;
      }

      const onboardingComplete = Boolean(
        profile?.fitness_goal &&
        profile.experience_level &&
        profile.training_days != null &&
        profile.session_length,
      );

      router.push(onboardingComplete ? "/dashboard" : "/onboarding");
      router.refresh();
    } catch {
      setError("Something went wrong while logging in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="noise flex min-h-screen items-center justify-center px-5 py-10"><div className="w-full max-w-md"><Link href="/" className="mx-auto mb-10 flex w-fit items-center gap-3 text-sm font-bold"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#174b39] text-[#c9f36d]"><Activity size={19} /></span>AI FITNESS <span className="text-[#86a63b]">COACH</span></Link><div className="rounded-3xl border border-[#e2e9e2] bg-white p-7 shadow-[0_20px_60px_#174b3910] sm:p-9"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#86a63b]">Welcome back</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.05em]">Log in to your rhythm.</h1><p className="mt-2 text-sm text-[#758078]">Your next session is closer than you think.</p><form onSubmit={submit} className="mt-8 space-y-4"><label className="block text-sm font-medium">Email<input name="email" type="email" required placeholder="you@example.com" className="mt-2 w-full rounded-xl border border-[#dfe8de] px-4 py-3 outline-none focus:border-[#174b39]" /></label><label className="block text-sm font-medium">Password<input name="password" type="password" required placeholder="••••••••" className="mt-2 w-full rounded-xl border border-[#dfe8de] px-4 py-3 outline-none focus:border-[#174b39]" /></label><div className="flex justify-end"><a href="#" className="text-xs font-semibold text-[#174b39]">Forgot password?</a></div>{error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}<PrimaryButton type="submit">{loading ? "Logging in..." : "Log in"} <ArrowRight size={16} /></PrimaryButton></form><p className="mt-7 text-center text-sm text-[#758078]">New here? <Link href="/signup" className="font-semibold text-[#174b39]">Create an account</Link></p></div></div></main>;
}

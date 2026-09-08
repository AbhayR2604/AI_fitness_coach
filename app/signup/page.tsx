"use client";

import Link from "next/link";
import { Activity, ArrowRight } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { PrimaryButton } from "@/components/ui";

export default function Signup() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const formData = new FormData(event.currentTarget);
    if (formData.get("password") !== formData.get("confirm")) {
      setError("Passwords need to match.");
      return;
    }
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: String(formData.get("email")),
      password: String(formData.get("password")),
      options: { data: { full_name: String(formData.get("name")) } },
    });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (data.session) {
      router.push("/onboarding");
      router.refresh();
    } else {
      setMessage("Account created. Check your email to confirm your account, then log in.");
    }
  }

  return <main className="noise flex min-h-screen items-center justify-center px-5 py-10"><div className="w-full max-w-md"><Link href="/" className="mx-auto mb-10 flex w-fit items-center gap-3 text-sm font-bold"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#174b39] text-[#c9f36d]"><Activity size={19} /></span>AI FITNESS <span className="text-[#86a63b]">COACH</span></Link><div className="rounded-3xl border border-[#e2e9e2] bg-white p-7 shadow-[0_20px_60px_#174b3910] sm:p-9"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#86a63b]">Start your plan</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.05em]">Build your baseline.</h1><p className="mt-2 text-sm text-[#758078]">A few quick choices help us shape your workspace.</p><form onSubmit={submit} className="mt-8 space-y-4"><label className="block text-sm font-medium">Full name<input name="name" required className="mt-2 w-full rounded-xl border border-[#dfe8de] px-4 py-3 outline-none focus:border-[#174b39]" /></label><label className="block text-sm font-medium">Email<input name="email" type="email" required className="mt-2 w-full rounded-xl border border-[#dfe8de] px-4 py-3 outline-none focus:border-[#174b39]" /></label><label className="block text-sm font-medium">Password<input name="password" type="password" minLength={6} required className="mt-2 w-full rounded-xl border border-[#dfe8de] px-4 py-3 outline-none focus:border-[#174b39]" /></label><label className="block text-sm font-medium">Confirm password<input name="confirm" type="password" minLength={6} required className="mt-2 w-full rounded-xl border border-[#dfe8de] px-4 py-3 outline-none focus:border-[#174b39]" /></label>{error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}{message && <p role="status" className="rounded-xl bg-[#e7f3d0] px-4 py-3 text-sm text-[#174b39]">{message}</p>}<PrimaryButton type="submit">{loading ? "Creating account..." : "Create account"} <ArrowRight size={16} /></PrimaryButton></form><p className="mt-7 text-center text-sm text-[#758078]">Already have an account? <Link href="/login" className="font-semibold text-[#174b39]">Log in</Link></p></div></div></main>;
}

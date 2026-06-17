"use client";

import { FormEvent, useState } from "react";
import { Loader2, Network } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setMessage("");
    const result = mode === "sign-in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (result.error) setMessage(result.error.message);
    else if (mode === "sign-up" && !result.data.session) setMessage("Check your email to confirm your account, then sign in.");
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="card w-full max-w-md p-7 sm:p-8">
        <div className="mb-7 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-lime text-white"><Network size={21} /></div>
          <div><h1 className="font-semibold text-slate-950">Network OS</h1><p className="text-xs text-slate-500">Secure cloud workspace</p></div>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{mode === "sign-in" ? "Sign in" : "Create account"}</h2>
        <p className="mt-2 text-sm text-slate-500">Your network data is private to your Supabase account.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label><span className="label">Email</span><input required type="email" className="input" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label><span className="label">Password</span><input required minLength={6} type="password" className="input" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {message && <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}
          <button disabled={loading} className="button-primary w-full">{loading && <Loader2 size={15} className="animate-spin" />}{mode === "sign-in" ? "Sign in" : "Create account"}</button>
        </form>
        <button onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setMessage(""); }} className="mt-5 w-full text-sm text-slate-500 hover:text-slate-950">
          {mode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}

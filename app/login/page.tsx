import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-md">
        <Link href="/" className="text-sm text-slate-400 hover:text-white">
          Back home
        </Link>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h1 className="text-3xl font-bold">Log In</h1>
          <p className="mt-3 text-slate-300">
            Supabase authentication will be added here soon.
          </p>

          <button className="mt-8 w-full rounded-xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:bg-slate-200">
            Continue with Email
          </button>
        </div>
      </section>
    </main>
  );
}
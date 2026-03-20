import { useState } from "react";
import { ShieldCheck, Building2 } from "lucide-react";

type LoginPageProps = {
  onLogin: (email: string, password: string) => boolean;
};

export function LoginPage({ onLogin }: LoginPageProps) {
  const [error, setError] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    const success = onLogin(email, password);

    if (!success) {
      setError("Incorrect email or password.");
      return;
    }

    setError("");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.2),_transparent_35%),linear-gradient(180deg,_#f8fbff_0%,_#eef4ff_100%)] px-6 py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_30px_90px_rgba(37,99,235,0.15)] md:grid-cols-[1.1fr_0.9fr]">
          <div className="hidden bg-[linear-gradient(160deg,_rgba(29,78,216,1)_0%,_rgba(37,99,235,0.92)_52%,_rgba(14,116,144,0.95)_100%)] p-10 text-white md:block">
            <div className="flex h-full flex-col justify-between">
              <div>
                <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
                  <ShieldCheck className="h-4 w-4" />
                  Secure Access
                </div>
                <h1 className="max-w-md text-4xl font-display font-extrabold leading-tight">
                  Property operations, behind a protected entry point.
                </h1>
                <p className="mt-5 max-w-md text-base text-white/80">
                  Sign in to access portfolio management, unit records, billing, maintenance, and reporting.
                </p>
              </div>

              <div className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-sm">
                <div className="flex items-center gap-3 text-sm text-white/80">
                  <Building2 className="h-5 w-5" />
                  Property Management Workspace
                </div>
                <p className="mt-3 text-sm leading-6 text-white/75">
                  This is a lightweight front-end gate for now. The next security step should be proper server-backed authentication.
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 sm:p-10">
            <div className="mx-auto max-w-md">
              <div className="mb-8">
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <h2 className="text-3xl font-display font-bold text-foreground">Sign In</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Enter your credentials to continue to the dashboard.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Email</label>
                  <input
                    required
                    name="email"
                    type="email"
                    autoComplete="username"
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="name@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Password</label>
                  <input
                    required
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="Enter your password"
                  />
                </div>

                {error ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Continue
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

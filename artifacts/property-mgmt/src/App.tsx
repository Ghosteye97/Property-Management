import { useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { ComplexesList } from "@/pages/ComplexesList";
import { ComplexDashboard } from "@/pages/ComplexDashboard";
import { AdminDashboard } from "@/pages/AdminDashboard";
import { LoginPage } from "@/pages/Login";
import { customFetch } from "@workspace/api-client-react";

const queryClient = new QueryClient();

type AuthUser = {
  id: number;
  email: string;
  fullName: string;
  role: string;
  portalType: "admin" | "client";
  tenantId: number | null;
};

function AppRouter() {
  const [location, setLocation] = useLocation();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    customFetch<{ user: AuthUser }>("/api/auth/me", { responseType: "json" })
      .then((response: { user: AuthUser }) => {
        if (!active) return;
        setAuthUser(response.user);
      })
      .catch(() => {
        if (!active) return;
        setAuthUser(null);
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await customFetch<{ user: AuthUser }>("/api/auth/login", {
        method: "POST",
        responseType: "json",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      setAuthUser(response.user);
      if (response.user.portalType === "client") {
        setLocation("/portal");
      } else if (response.user.role === "Platform Admin") {
        setLocation("/admin");
      } else {
        setLocation("/");
      }
      return { success: true };
    } catch {
      return { success: false, message: "Incorrect email or password." };
    }
  };

  const handleLogout = async () => {
    await customFetch("/api/auth/logout", {
      method: "POST",
      responseType: "json",
    }).catch(() => undefined);

    setAuthUser(null);
    setLocation("/login");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!authUser && location !== "/login") {
    return <Redirect to="/login" />;
  }

  if (authUser?.role === "Platform Admin" && location !== "/admin" && location !== "/login") {
    return <Redirect to="/admin" />;
  }

  if (authUser?.role !== "Platform Admin" && location === "/admin") {
    return <Redirect to={authUser?.portalType === "client" ? "/portal" : "/"} />;
  }

  if (authUser?.portalType !== "admin" && location !== "/portal" && location !== "/login") {
    return <Redirect to="/portal" />;
  }

  return (
    <Switch>
      <Route path="/login">
        {() =>
          authUser ? (
            <Redirect
              to={
                authUser.portalType === "client"
                  ? "/portal"
                  : authUser.role === "Platform Admin"
                    ? "/admin"
                    : "/"
              }
            />
          ) : (
            <LoginPage onLogin={handleLogin} />
          )
        }
      </Route>
      <Route path="/admin">
        {() =>
          authUser?.role === "Platform Admin" ? (
            <AdminDashboard onLogout={handleLogout} />
          ) : authUser ? (
            <Redirect to="/" />
          ) : (
            <Redirect to="/login" />
          )
        }
      </Route>
      <Route path="/portal">
        {() =>
          authUser?.portalType === "client" ? (
            <ClientPortalPlaceholder onLogout={handleLogout} user={authUser} />
          ) : authUser ? (
            <Redirect to="/" />
          ) : (
            <Redirect to="/login" />
          )
        }
      </Route>
      <Route path="/">
        {() =>
          authUser?.portalType === "admin" ? (
            <ComplexesList onLogout={handleLogout} />
          ) : authUser ? (
            <Redirect to="/portal" />
          ) : (
            <Redirect to="/login" />
          )
        }
      </Route>
      <Route path="/home">
        {() => <Redirect to="/" />}
      </Route>
      <Route path="/complexes/:id" component={ComplexDashboard} />
      <Route path="/complexes/:id/:section" component={ComplexDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRouter />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function ClientPortalPlaceholder({
  user,
  onLogout,
}: {
  user: AuthUser;
  onLogout: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-2xl rounded-3xl border bg-white p-10 shadow-sm">
        <h1 className="text-3xl font-display font-bold text-foreground">
          Client Portal Coming Soon
        </h1>
        <p className="mt-3 text-muted-foreground">
          Signed in as {user.fullName} ({user.email}). This route is reserved for future owner, trustee, and tenant access.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onLogout}
            className="rounded-xl border px-4 py-2 font-medium text-foreground transition-colors hover:bg-muted"
          >
            Sign Out
          </button>
          <a
            href="/"
            className="rounded-xl bg-primary px-4 py-2 font-medium text-primary-foreground"
          >
            Admin Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

export default App;

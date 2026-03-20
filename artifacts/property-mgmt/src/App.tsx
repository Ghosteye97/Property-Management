import { useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { ComplexesList } from "@/pages/ComplexesList";
import { ComplexDashboard } from "@/pages/ComplexDashboard";
import { LoginPage } from "@/pages/Login";

const queryClient = new QueryClient();
const AUTH_STORAGE_KEY = "pm_auth_session";
const AUTH_EMAIL = "juanjvr9927@gmail.com";
const AUTH_PASSWORD = "12345678";

function AppRouter() {
  const [location, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsAuthenticated(window.sessionStorage.getItem(AUTH_STORAGE_KEY) === "true");
  }, []);

  const handleLogin = (email: string, password: string) => {
    const success = email === AUTH_EMAIL && password === AUTH_PASSWORD;

    if (!success) {
      return false;
    }

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(AUTH_STORAGE_KEY, "true");
    }

    setIsAuthenticated(true);
    setLocation("/");
    return true;
  };

  if (!isAuthenticated && location !== "/login") {
    return <Redirect to="/login" />;
  }

  return (
    <Switch>
      <Route path="/login">
        {() => (isAuthenticated ? <Redirect to="/" /> : <LoginPage onLogin={handleLogin} />)}
      </Route>
      <Route path="/" component={ComplexesList} />
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

export default App;

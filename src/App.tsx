import { useEffect, useState } from "react";
import { Switch, Route, Redirect, useRoute } from "wouter";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ThemeProvider";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Tests from "@/pages/Tests";
import Patients from "@/pages/Patients";
import Results from "@/pages/Results";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { initializeDefaults } from "@/data/db";
import { AnimatePresence } from "framer-motion";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, params] = useRoute("/:rest*");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground text-lg">Loading secure content…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" state={{ from: params?.rest ? `/${params.rest}` : "/" }} />;
  }

  return <Component />;
}

function Router() {
  return (
    <AnimatePresence mode="wait">
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
        <Route path="/tests" component={() => <ProtectedRoute component={Tests} />} />
        <Route path="/patients" component={() => <ProtectedRoute component={Patients} />} />
        <Route path="/results" component={() => <ProtectedRoute component={Results} />} />
        <Route path="/reports" component={() => <ProtectedRoute component={Reports} />} />
        <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
        <Route component={NotFound} />
      </Switch>
    </AnimatePresence>
  );
}

function AppContent() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initializeDefaults().finally(() => setIsReady(true));
  }, []);

  if (!isReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="w-16 h-16 border-4 border-primary/30 border-t-primary animate-spin rounded-full mb-6" />
        <p className="text-muted-foreground text-lg tracking-wide">Preparing your laboratory workspace…</p>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

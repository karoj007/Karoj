import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./toaster";
import { TooltipProvider } from "./tooltip";
import { ThemeProvider } from "./ThemeProvider";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Login from "./Login";
import Dashboard from "./Dashboard";
import Tests from "./Tests";
import Patients from "./Patients";
import Results from "./Results";
import Reports from "./Reports";
import Settings from "./Settings";
import NotFound from "./not-found";
import { useLocation } from "wouter";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/session");
        const data = await response.json();
        setIsAuthenticated(data.authenticated);
        
        // Sync with sessionStorage for quick checks
        if (data.authenticated) {
          sessionStorage.setItem("lab-authenticated", "true");
        } else {
          sessionStorage.removeItem("lab-authenticated");
        }
      } catch (error) {
        setIsAuthenticated(false);
        sessionStorage.removeItem("lab-authenticated");
      } finally {
        setIsChecking(false);
      }
    };

    checkSession();
  }, []);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

function Router() {
  const [location] = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
      >
        <Switch>
          <Route path="/login" component={Login} />
          <Route path="/">
            {() => <ProtectedRoute component={Dashboard} />}
          </Route>
          <Route path="/tests">
            {() => <ProtectedRoute component={Tests} />}
          </Route>
          <Route path="/patients">
            {() => <ProtectedRoute component={Patients} />}
          </Route>
          <Route path="/results">
            {() => <ProtectedRoute component={Results} />}
          </Route>
          <Route path="/reports">
            {() => <ProtectedRoute component={Reports} />}
          </Route>
          <Route path="/settings">
            {() => <ProtectedRoute component={Settings} />}
          </Route>
          <Route component={NotFound} />
        </Switch>
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

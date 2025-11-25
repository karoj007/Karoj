import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useEffect, useState } from "react";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Tests from "@/pages/Tests";
import Patients from "@/pages/Patients";
import Results from "@/pages/Results";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import Accounts from "@/pages/Accounts"; // صفحة الحسابات
import NotFound from "@/pages/not-found";

// مكون الحماية البسيط (مثل القديم تماماً لضمان الدخول)
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/session");
        const data = await response.json();
        
        // نعتمد فقط على هل هو مسجل دخول أم لا
        if (data.authenticated) {
          setIsAuthenticated(true);
          sessionStorage.setItem("lab-authenticated", "true");
        } else {
          setIsAuthenticated(false);
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
        <div className="animate-pulse text-muted-foreground">جاري التحميل...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      {/* جميع الصفحات محمية بالحماية البسيطة */}
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
      
      {/* تمت إضافة مسار صفحة الحسابات */}
      <Route path="/accounts">
        {() => <ProtectedRoute component={Accounts} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
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

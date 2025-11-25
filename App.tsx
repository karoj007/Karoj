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
import Accounts from "@/pages/Accounts"; // الصفحة الجديدة
import NotFound from "@/pages/not-found";

// تعريف الصلاحيات
type PermissionSection = 'patients' | 'results' | 'reports' | 'settings' | 'accounts' | 'tests';
type PermissionAction = 'view' | 'access';

function ProtectedRoute({ component: Component, requiredPerm }: { component: React.ComponentType, requiredPerm?: { section: PermissionSection, action: PermissionAction } }) {
  const [user, setUser] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/session");
        const data = await response.json();
        if (data.authenticated) {
          setUser(data.user); 
          sessionStorage.setItem("lab-authenticated", "true");
        } else {
          setUser(null);
          sessionStorage.removeItem("lab-authenticated");
        }
      } catch (error) {
        setUser(null);
        sessionStorage.removeItem("lab-authenticated");
      } finally {
        setIsChecking(false);
      }
    };
    checkSession();
  }, []);

  if (isChecking) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;

  if (!user) return <Redirect to="/login" />;

  // فحص الصلاحيات (الشرطي)
  if (requiredPerm) {
    let perms = user.permissions;
    if (typeof perms === 'string') { try { perms = JSON.parse(perms); } catch(e) {} }
    
    if (perms && perms[requiredPerm.section] && perms[requiredPerm.section][requiredPerm.action] === false) {
      return <Redirect to="/" />;
    }
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/tests">
        {() => <ProtectedRoute component={Tests} requiredPerm={{ section: 'tests', action: 'access' }} />}
      </Route>
      <Route path="/patients">
        {() => <ProtectedRoute component={Patients} requiredPerm={{ section: 'patients', action: 'view' }} />}
      </Route>
      <Route path="/results">
        {() => <ProtectedRoute component={Results} requiredPerm={{ section: 'results', action: 'view' }} />}
      </Route>
      <Route path="/reports">
        {() => <ProtectedRoute component={Reports} requiredPerm={{ section: 'reports', action: 'view' }} />}
      </Route>
      <Route path="/settings">
        {() => <ProtectedRoute component={Settings} requiredPerm={{ section: 'settings', action: 'access' }} />}
      </Route>
      <Route path="/accounts">
        {() => <ProtectedRoute component={Accounts} requiredPerm={{ section: 'accounts', action: 'access' }} />}
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

import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center">
          <FileQuestion className="h-10 w-10 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>
          <p className="text-lg text-muted-foreground">Page not found</p>
        </div>
        <Button onClick={() => setLocation("/")} data-testid="button-home">
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}

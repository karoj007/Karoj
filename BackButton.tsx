import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export function BackButton() {
  const [, setLocation] = useLocation();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLocation("/")}
      className="gap-2"
      data-testid="button-back"
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </Button>
  );
}

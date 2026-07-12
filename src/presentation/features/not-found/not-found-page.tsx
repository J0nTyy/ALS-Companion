import { useNavigate } from "react-router-dom";
import { Compass } from "lucide-react";

import { EmptyState } from "@/presentation/components/empty-state";
import { Button } from "@/presentation/components/ui/button";

/** Shown for any unrecognized route. Always offers a way back home. */
export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <EmptyState
      icon={Compass}
      title="Page not found"
      description="That screen doesn't exist. Let's get you back to a familiar place."
      action={<Button onClick={() => navigate("/")}>Return home</Button>}
    />
  );
}

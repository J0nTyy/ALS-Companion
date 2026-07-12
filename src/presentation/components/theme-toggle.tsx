import { Moon, Sun } from "lucide-react";

import { Button } from "@/presentation/components/ui/button";
import { useTheme } from "@/shared/hooks/use-theme";

/**
 * A single, obvious control that flips between light and dark. Kept deliberately
 * simple (one tap) rather than a three-way menu to honor the low-friction goal.
 */
export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const nextIsDark = resolvedTheme === "light";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={nextIsDark ? "Switch to dark mode" : "Switch to light mode"}
      title={nextIsDark ? "Switch to dark mode" : "Switch to light mode"}
    >
      {resolvedTheme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}

import { Monitor, Moon, Sun } from "lucide-react";

import { PageHeader } from "@/presentation/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/presentation/components/ui/card";
import { cn } from "@/shared/lib/utils";
import { APP } from "@/shared/config/app";
import { useTheme, type Theme } from "@/shared/hooks/use-theme";

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/**
 * Settings collects the few preferences a researcher can safely adjust.
 * Appearance is fully functional today; more options arrive as features land.
 */
export function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Adjust how the app looks and review information about this workspace."
      />

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Choose a theme. "System" follows your computer's setting
            automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            role="radiogroup"
            aria-label="Theme"
            className="grid grid-cols-1 gap-3 sm:grid-cols-3"
          >
            {THEME_OPTIONS.map((option) => {
              const selected = theme === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-4 py-4 text-left transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    selected
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <option.icon className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
          <CardDescription>{APP.tagline}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            <div className="flex justify-between border-b border-border pb-2">
              <dt className="text-muted-foreground">Application</dt>
              <dd className="font-medium text-foreground">{APP.name}</dd>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <dt className="text-muted-foreground">Version</dt>
              <dd className="font-medium text-foreground">{APP.version}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            This software supports research productivity. It is not a diagnostic
            tool and must not be used to diagnose or treat any condition.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

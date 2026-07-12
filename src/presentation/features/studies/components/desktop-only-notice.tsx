import { Laptop } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/presentation/components/ui/card";

/**
 * Shown in the browser preview wherever saving would be required. It explains —
 * honestly and without jargon — that studies live in the installed desktop app,
 * and never implies that any studies exist.
 */
export function DesktopOnlyNotice() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Laptop className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Saving needs the desktop app</CardTitle>
            <CardDescription>You're viewing a browser preview</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Studies are created and stored by the installed desktop app, where your
          data stays privately on your computer. This browser preview is for
          exploring the interface — it can't create or show saved studies.
        </p>
      </CardContent>
    </Card>
  );
}

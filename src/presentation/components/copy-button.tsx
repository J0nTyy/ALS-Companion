import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/presentation/components/ui/button";
import { useToast } from "@/presentation/features/toast/toast-context";

/**
 * Copies `value` to the clipboard, showing a brief inline "copied" check and a
 * toast. Falls back gracefully (and reports honestly) when the clipboard API is
 * unavailable. Icon-only by default; pass `label` for a labelled button.
 */
export function CopyButton({
  value,
  label,
  copiedMessage = "Copied to clipboard.",
  ariaLabel = "Copy to clipboard",
  size = "sm",
}: {
  value: string;
  label?: string;
  copiedMessage?: string;
  ariaLabel?: string;
  size?: "sm" | "icon";
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(copiedMessage);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't access the clipboard.");
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      onClick={() => void copy()}
      aria-label={label ? undefined : ariaLabel}
    >
      {copied ? <Check className="text-success" /> : <Copy />}
      {label ? <span>{copied ? "Copied" : label}</span> : null}
    </Button>
  );
}

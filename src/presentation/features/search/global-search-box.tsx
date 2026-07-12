import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

import { Input } from "@/presentation/components/ui/input";

/**
 * The always-available global search entry point in the app shell's top bar.
 * Submitting navigates to the Search page with the text pre-filled, so a
 * researcher can start a search from anywhere. The box itself holds no results —
 * the Search page owns the query, filters, and results.
 */
export function GlobalSearchBox() {
  const navigate = useNavigate();
  const [text, setText] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = text.trim();
    navigate(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  }

  return (
    <form onSubmit={handleSubmit} role="search" className="w-full max-w-sm">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Search studies, animals, MRI, files…"
          aria-label="Search"
          className="pl-9"
        />
      </div>
    </form>
  );
}

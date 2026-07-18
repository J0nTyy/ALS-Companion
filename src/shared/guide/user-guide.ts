/**
 * The canonical User Guide, loaded once from the tracked `USER_GUIDE.md` via Vite's
 * `?raw` import and parsed into sections. Both the in-app Help page and the AI
 * assistant's `search_user_guide` tool read from this single source, so guide help
 * always reflects the shipped documentation (no separate, drift-prone copy).
 */
import guideSource from "../../../USER_GUIDE.md?raw";
import { parseGuide, type ParsedGuide } from "@/shared/guide/guide-search";

export const USER_GUIDE: ParsedGuide = parseGuide(guideSource);

import type { IdGenerator } from "@/application/ports/system";

/** Generates RFC-4122 v4 UUIDs via the Web Crypto API (available in the shell). */
export const uuidIdGenerator: IdGenerator = {
  next: () => crypto.randomUUID(),
};

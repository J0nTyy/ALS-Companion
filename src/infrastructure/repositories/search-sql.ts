/**
 * Shared helpers for building the parameterized WHERE clause of a search query.
 *
 * Every searchable repository pushes the free-text term and its own applicable
 * filters down to SQL through a {@link SearchConditionBuilder} so the whole table
 * is never loaded into memory. All values are bound as parameters — user input is
 * never concatenated into SQL. `LIKE` special characters are escaped so a term
 * like "50%" or "a_b" matches literally.
 */

/** Cap on rows returned per entity type — search shows the most relevant slice. */
export const SEARCH_PER_TYPE_LIMIT = 50;

/** Escape `%`, `_`, and the escape character itself for a `LIKE ... ESCAPE '\'`. */
export function escapeLikeTerm(term: string): string {
  return term.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/**
 * Accumulates SQL conditions and their bound parameters. Only "user conditions"
 * (text/filters) count toward {@link hasUserConditions}; fixed structural clauses
 * added via {@link raw} do not, so a reader never returns the whole table when no
 * real criteria were supplied.
 */
export class SearchConditionBuilder {
  readonly params: unknown[] = [];
  private readonly clauses: string[] = [];
  private userConditionCount = 0;

  /** Case-insensitive substring match across any of `columns` (single bound term). */
  text(columns: readonly string[], term: string): this {
    const trimmed = term.trim();
    if (trimmed.length === 0 || columns.length === 0) return this;
    this.params.push(`%${escapeLikeTerm(trimmed)}%`);
    const i = this.params.length;
    const ored = columns
      .map((c) => `${c} LIKE $${i} ESCAPE '\\'`)
      .join(" OR ");
    this.clauses.push(`(${ored})`);
    this.userConditionCount += 1;
    return this;
  }

  /** Case-insensitive substring match on a single free-text column. */
  contains(column: string, value: string | undefined): this {
    const trimmed = value?.trim();
    if (!trimmed) return this;
    this.params.push(`%${escapeLikeTerm(trimmed)}%`);
    this.clauses.push(`${column} LIKE $${this.params.length} ESCAPE '\\'`);
    this.userConditionCount += 1;
    return this;
  }

  /** Exact match on a column (skipped when the value is absent/blank). */
  eq(column: string, value: string | undefined): this {
    const trimmed = value?.trim();
    if (!trimmed) return this;
    this.params.push(trimmed);
    this.clauses.push(`${column} = $${this.params.length}`);
    this.userConditionCount += 1;
    return this;
  }

  /** Inclusive lower bound (`column >= value`). */
  gte(column: string, value: string | undefined): this {
    const trimmed = value?.trim();
    if (!trimmed) return this;
    this.params.push(trimmed);
    this.clauses.push(`${column} >= $${this.params.length}`);
    this.userConditionCount += 1;
    return this;
  }

  /** Inclusive upper bound (`column <= value`). */
  lte(column: string, value: string | undefined): this {
    const trimmed = value?.trim();
    if (!trimmed) return this;
    this.params.push(trimmed);
    this.clauses.push(`${column} <= $${this.params.length}`);
    this.userConditionCount += 1;
    return this;
  }

  /** A fixed structural condition (e.g. a polymorphic discriminator). */
  raw(clause: string): this {
    this.clauses.push(clause);
    return this;
  }

  /** Whether any text/filter condition was added (structural `raw` excluded). */
  hasUserConditions(): boolean {
    return this.userConditionCount > 0;
  }

  /** The `WHERE ...` fragment (empty string when there are no conditions). */
  whereSql(): string {
    return this.clauses.length > 0 ? `WHERE ${this.clauses.join(" AND ")}` : "";
  }
}

// lib/d1.ts
// Cloudflare D1 REST API client — the ONLY database access path in this app.
// All API routes must import and use the `query` function from this module.

const CF_ACCOUNT_ID  = process.env.CF_ACCOUNT_ID!;
const CF_D1_DB_ID    = process.env.CF_D1_DATABASE_ID!;
const CF_API_TOKEN   = process.env.CF_API_TOKEN!;

const D1_URL = () =>
  `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_D1_DB_ID}/query`;

export class D1Error extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly raw?: unknown,
  ) {
    super(message);
    this.name = 'D1Error';
  }
}

interface D1Response {
  success: boolean;
  result: Array<{
    results: Record<string, unknown>[];
    success: boolean;
    meta: Record<string, unknown>;
  }>;
  errors?: Array<{ code: number; message: string }>;
}

/**
 * Execute a parameterized SQL statement against Cloudflare D1.
 * @param sql    - The SQL query with `?` placeholders
 * @param params - Ordered array of values to bind
 * @returns      - The rows from the first result set
 */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const res = await fetch(D1_URL(), {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new D1Error(`D1 HTTP error ${res.status}`, res.status, text);
  }

  const data: D1Response = await res.json();

  if (!data.success) {
    throw new D1Error(
      data.errors?.[0]?.message ?? 'D1 query failed',
      undefined,
      data,
    );
  }

  return (data.result[0]?.results ?? []) as T[];
}

/**
 * Convenience: run a query that returns zero or one row.
 */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/**
 * Convenience: run a mutation (INSERT / UPDATE / DELETE) and return meta.
 */
export async function execute(
  sql: string,
  params: unknown[] = [],
): Promise<{ changes: number; last_row_id: number }> {
  const res = await fetch(D1_URL(), {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new D1Error(`D1 HTTP error ${res.status}`, res.status, text);
  }

  const data: D1Response = await res.json();

  if (!data.success) {
    throw new D1Error(
      data.errors?.[0]?.message ?? 'D1 execute failed',
      undefined,
      data,
    );
  }

  const meta = data.result[0]?.meta ?? {};
  return {
    changes:     (meta.changes as number)     ?? 0,
    last_row_id: (meta.last_row_id as number) ?? 0,
  };
}

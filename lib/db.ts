import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { Pool } from "pg";
import type { DB } from "./types";

// Dos modos de almacenamiento, con la misma API:
//  - Con DATABASE_URL (Postgres, p. ej. Neon): todo el estado vive en una fila jsonb.
//  - Sin ella: archivo local data/db.json (solo para desarrollo).

const FILE = path.join(process.cwd(), "data", "db.json");
const PG_URL = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

const DEFAULT_DB: DB = {
  members: [
    { id: "m1", name: "Persona 1", theme: "blue" },
    { id: "m2", name: "Persona 2", theme: "orange" },
  ],
  projects: [],
};

// ---------- Postgres ----------
let pool: Pool | undefined;
let ready: Promise<void> | undefined;

function getPool() {
  pool ??= new Pool({ connectionString: PG_URL, max: 3 });
  return pool;
}

function ensureTable() {
  ready ??= getPool()
    .query("CREATE TABLE IF NOT EXISTS kv (key text PRIMARY KEY, value jsonb NOT NULL)")
    .then(() => undefined);
  return ready;
}

async function pgRead(): Promise<DB> {
  await ensureTable();
  const { rows } = await getPool().query("SELECT value FROM kv WHERE key = 'db'");
  return (rows[0]?.value as DB) ?? structuredClone(DEFAULT_DB);
}

async function pgMutate<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  await ensureTable();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("INSERT INTO kv (key, value) VALUES ('db', $1) ON CONFLICT (key) DO NOTHING", [
      JSON.stringify(DEFAULT_DB),
    ]);
    // FOR UPDATE bloquea la fila: dos cambios simultáneos no se pisan.
    const { rows } = await client.query("SELECT value FROM kv WHERE key = 'db' FOR UPDATE");
    const db = rows[0].value as DB;
    const result = await fn(db);
    await client.query("UPDATE kv SET value = $1 WHERE key = 'db'", [JSON.stringify(db)]);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
}

// ---------- Archivo local ----------
let queue: Promise<unknown> = Promise.resolve();

async function fileRead(): Promise<DB> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as DB;
  } catch {
    return structuredClone(DEFAULT_DB);
  }
}

function fileMutate<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const db = await fileRead();
    const result = await fn(db);
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(db, null, 2));
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

// ---------- API pública ----------
export const readDB = (): Promise<DB> => (PG_URL ? pgRead() : fileRead());

/** Lee, modifica y guarda de forma atómica. */
export const mutateDB = <T>(fn: (db: DB) => T | Promise<T>): Promise<T> =>
  PG_URL ? pgMutate(fn) : fileMutate(fn);

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Next.js reloads route/module code on every request in dev mode (and
 * bundles can be re-evaluated across serverless invocations in prod). If
 * `connect()` called `mongoose.connect()` fresh every time, each reload
 * would open a new connection to Atlas and the free-tier connection pool
 * would exhaust itself within minutes of active development.
 *
 * The fix is the standard Next.js pattern: stash the connection (and the
 * in-flight connection promise, so concurrent callers await the same
 * connect instead of racing to open two) on `globalThis`, which survives
 * module reloads within the same Node process.
 */
type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var _mongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache = global._mongooseCache ?? { conn: null, promise: null };
global._mongooseCache = cache;

export async function connect(): Promise<typeof mongoose> {
  if (cache.conn) {
    return cache.conn;
  }

  if (!MONGODB_URI) {
    throw new Error(
      'Missing MONGODB_URI environment variable. Copy .env.example to .env.local and fill it in.',
    );
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI);
  }

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    // Let the next call retry instead of caching a rejected promise forever.
    cache.promise = null;
    throw err;
  }

  return cache.conn;
}

/**
 * For one-off scripts (seed, migrations) that need the process to exit
 * cleanly — Next.js route handlers never call this, since the whole point
 * of the cache above is to keep the connection open across requests.
 */
export async function disconnect(): Promise<void> {
  if (cache.conn) {
    await cache.conn.disconnect();
    cache.conn = null;
    cache.promise = null;
  }
}

export default connect;

import mongoose from "mongoose";

/**
 * The single Mongo connection, shared by every request a container serves.
 *
 * Two things matter here that a plain `mongoose.connect()` gets wrong under
 * serverless, and both cost whole seconds on a cold start:
 *
 * 1. The in-flight promise is cached, not just the finished connection. A page
 *    like /products fires four queries in one `Promise.all`, and each one
 *    awaits this. Caching only the settled connection means all four see
 *    "not connected yet" and start their own handshake — four SRV lookups,
 *    four TLS negotiations — where one would do.
 *
 * 2. `autoIndex` is off in production. Mongoose's default is to issue
 *    `createIndexes` for every registered model on connect; this app registers
 *    fifteen, carrying about sixty index declarations between them. Measured
 *    against the live cluster that is roughly 3.9s of round trips on every
 *    cold start, asking whether indexes that already exist still exist —
 *    which is where a click on a sidebar link used to spend its time.
 */
const globalForMongoose = globalThis;

const IS_PRODUCTION = process.env.NODE_ENV === "production";

const CONNECT_OPTIONS = {
  /**
   * Off in production, on in development — locally the convenience of a schema
   * change taking effect on save is worth the round trips, and there is no
   * cold start to protect.
   *
   * The consequence, which is easy to forget because nothing announces it:
   * adding a `schema.index(...)` to a model does NOT create that index in
   * production. It will be created locally the next time you run the app, so
   * it looks like it worked. In production the query simply falls back to
   * scanning the collection — correct results, quietly slower, no error
   * anywhere.
   *
   * So a new index has to be created by hand, in the Atlas UI:
   * Collections → Indexes → Create Index, matching the schema declaration.
   * Existing indexes need nothing; they are server-side objects and persist
   * across deploys on their own.
   */
  autoIndex: !IS_PRODUCTION,

  /**
   * Sized for an M0 shared tier reached from short-lived functions. Each
   * container keeps its own pool, so this is a per-container ceiling rather
   * than a total: eight leaves room for the four parallel reads the busiest
   * page makes, plus headroom, without a handful of warm containers eating the
   * cluster's connection budget.
   */
  maxPoolSize: 8,

  /** Nothing held open while a container idles between requests. */
  minPoolSize: 0,

  /**
   * Five seconds, not the driver's default thirty. If the cluster cannot be
   * reached, an error the page can handle beats a request that hangs long
   * enough for the platform to kill it first.
   */
  serverSelectionTimeoutMS: 5000,

  socketTimeoutMS: 20000,
};

/**
 * A dropped connection must not leave a resolved promise pointing at it — the
 * next request would take the fast path and hand out a dead handle. Registered
 * once per container, not once per call.
 */
function watchForDrop() {
  if (globalForMongoose.mongooseDropWatched) return;
  globalForMongoose.mongooseDropWatched = true;

  mongoose.connection.on("disconnected", () => {
    globalForMongoose.mongoosePromise = null;
  });
}

export function connectDb() {
  // readyState 1 is "connected", and on a warm container it is what almost
  // every call sees. Returning here skips the promise bookkeeping entirely.
  if (mongoose.connection.readyState === 1) {
    return Promise.resolve(mongoose.connection);
  }

  // A handshake is already under way — join it.
  if (globalForMongoose.mongoosePromise) {
    return globalForMongoose.mongoosePromise;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return Promise.reject(new Error("MONGODB_URI is not set"));
  }

  watchForDrop();

  globalForMongoose.mongoosePromise = mongoose
    .connect(uri, CONNECT_OPTIONS)
    .then((instance) => instance.connection)
    .catch((error) => {
      // A cached rejected promise would poison the container: every later
      // request would inherit this one failure instead of retrying.
      globalForMongoose.mongoosePromise = null;
      throw error;
    });

  return globalForMongoose.mongoosePromise;
}

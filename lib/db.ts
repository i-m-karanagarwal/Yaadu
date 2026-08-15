import { MongoClient, Db, Collection } from "mongodb";
import type { BillDocument } from "./bill-document";

/**
 * Serverless (Vercel) MongoDB client.
 * Client is cached on globalThis so warm invocations reuse the pool.
 * maxPoolSize 5 / minPoolSize 0 / maxIdleTimeMS 30s — right-sized for
 * a single-user Vercel function fleet on Atlas M0.
 */
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }

  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 5,
      minPoolSize: 0,
      maxIdleTimeMS: 30_000,
      connectTimeoutMS: 10_000,
      serverSelectionTimeoutMS: 5_000,
    });
    global._mongoClientPromise = client.connect();
  }

  return global._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db("yaadu");
}

export async function getBillsCollection(): Promise<Collection<BillDocument>> {
  const db = await getDb();
  return db.collection<BillDocument>("bills");
}

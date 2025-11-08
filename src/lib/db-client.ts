// lib/db.ts

import mongoose from "mongoose";
import { Db } from "mongodb";

// const username = process.env.DB_USERNAME
const password = Bun.env.DB_PASSWORD;
const clusterUri = Bun.env.MONGODB_URI;
const dbName = Bun.env.DB_NAME;

if (!password || !clusterUri || !dbName) {
  throw new Error("Missing MongoDB environment variables");
}

const uri = `${clusterUri}/${dbName}?retryWrites=true&w=majority`.replace(
  "<db_password>",
  encodeURIComponent(password),
);

declare global {
  var mongooseCache:
    | {
        conn: typeof mongoose | null;
        db: any;
        promise: Promise<typeof mongoose> | null;
      }
    | undefined;
}

if (!global.mongooseCache) {
  global.mongooseCache = {
    conn: null,
    db: undefined,
    promise: null,
  };
}

async function init(): Promise<Db> {
  if (global.mongooseCache!.db) {
    return global.mongooseCache!.db as Db;
  }

  if (!global.mongooseCache!.promise) {
    global.mongooseCache!.promise = mongoose.connect(uri);
  }

  const mongooseInstance = await global.mongooseCache!.promise;
  global.mongooseCache!.conn = mongooseInstance;
  global.mongooseCache!.db = mongooseInstance.connection.db;

  return global.mongooseCache!.db as Db;
}

export const client = await init();
export const mongooseConn = global.mongooseCache!.promise!;

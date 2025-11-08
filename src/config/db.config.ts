import * as mongoose from "mongoose";

const DB = async () => {
  try {
    const password = Bun.env.DB_PASSWORD;
    const clusterUri = Bun.env.MONGODB_URI;
    const dbName = Bun.env.DB_NAME;

    if (!password || !clusterUri || !dbName) {
      throw new Error("Missing MongoDB environment variables");
    }
    const mongoUri =
      `${clusterUri}/${dbName}?retryWrites=true&w=majority`.replace(
        "<db_password>",
        encodeURIComponent(password),
      );

    console.log();
    console.log("🗄️  Connecting to MongoDB at:", clusterUri.split("@")[1]);
    await mongoose.connect(mongoUri, {
      autoIndex: true,
    });

    console.log(`✅ MongoDB Connected`);
    console.log("🔹 Status:", "Running");
    console.log();
  } catch (err: any) {
    console.error(`❌ MongoDB Connection Error: ${err.message}`);
    process.exit(1); // Exit on failure
  }
};

export default DB;

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;
let cachedApp;

async function setupApp() {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";

  if (!mongoServer) {
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongoServer.getUri();
  }

  if (!cachedApp) {
    const { app, connectToDatabase } = require("../../index");
    await connectToDatabase();
    cachedApp = app;
  }

  return cachedApp;
}

async function clearDatabase() {
  const { collections } = mongoose.connection;
  const promises = Object.values(collections).map((collection) => collection.deleteMany({}));
  await Promise.all(promises);
}

async function teardown() {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
  cachedApp = null;
}

module.exports = {
  setupApp,
  clearDatabase,
  teardown,
};

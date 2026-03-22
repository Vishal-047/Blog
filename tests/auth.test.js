const request = require("supertest");
const User = require("../model/user");
const { setupApp, clearDatabase, teardown } = require("./helpers/testServer");

describe("Auth routes", () => {
  let app;

  beforeAll(async () => {
    app = await setupApp();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await teardown();
  });

  test("POST /user/signup returns validation error for weak password", async () => {
    const res = await request(app).post("/user/signup").type("form").send({
      fullName: "Test User",
      email: "test@example.com",
      password: "123",
    });

    expect(res.status).toBe(400);
    expect(res.text).toContain("Password must be at least 8 characters long");
  });

  test("POST /user/signup creates account", async () => {
    const res = await request(app).post("/user/signup").type("form").send({
      fullName: "Test User",
      email: "test@example.com",
      password: "password123",
    });

    expect(res.status).toBe(302);
    expect(res.header.location).toContain("signin");

    const createdUser = await User.findOne({ email: "test@example.com" });
    expect(createdUser).toBeTruthy();
  });

  test("POST /user/signup returns duplicate user error", async () => {
    await User.create({
      fullName: "Existing User",
      email: "test@example.com",
      password: "password123",
    });

    const res = await request(app).post("/user/signup").type("form").send({
      fullName: "Another User",
      email: "test@example.com",
      password: "password123",
    });

    expect(res.status).toBe(409);
    expect(res.text).toContain("User already exists. Try to login");
  });

  test("POST /user/signin logs in and sets auth cookie", async () => {
    await User.create({
      fullName: "Signin User",
      email: "signin@example.com",
      password: "password123",
    });

    const res = await request(app).post("/user/signin").type("form").send({
      email: "signin@example.com",
      password: "password123",
    });

    expect(res.status).toBe(302);
    expect(res.header["set-cookie"]).toEqual(expect.arrayContaining([expect.stringContaining("token=")]));
  });
});

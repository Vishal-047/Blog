const path = require("path");
const request = require("supertest");
const Blog = require("../model/blog");
const User = require("../model/user");
const { setupApp, clearDatabase, teardown } = require("./helpers/testServer");

describe("Blog routes", () => {
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

  async function createLoggedInAgent() {
    const agent = request.agent(app);
    await agent.post("/user/signup").type("form").send({
      fullName: "Blog User",
      email: "blogger@example.com",
      password: "password123",
    });
    await agent.post("/user/signin").type("form").send({
      email: "blogger@example.com",
      password: "password123",
    });
    return agent;
  }

  test("GET /blog/createBlog redirects unauthenticated users", async () => {
    const res = await request(app).get("/blog/createBlog");
    expect(res.status).toBe(302);
    expect(res.header.location).toBe("/user/signin");
  });

  test("POST /blog validates title/content fields", async () => {
    const agent = await createLoggedInAgent();
    const res = await agent.post("/blog").field("title", "Hi").field("body", "Too short");

    expect(res.status).toBe(400);
    expect(res.text).toContain("Title must be at least 3 characters long");
  });

  test("POST /blog creates a blog post when valid", async () => {
    const agent = await createLoggedInAgent();
    const coverPath = path.join(__dirname, "fixtures", "cover.txt");
    const res = await agent
      .post("/blog")
      .field("title", "My first test blog")
      .field("body", "This is a sufficiently long blog content for testing purpose.")
      .attach("coverImage", coverPath);

    expect(res.status).toBe(302);
    expect(res.header.location).toBe("/");

    const created = await Blog.findOne({ title: "My first test blog" });
    expect(created).toBeTruthy();
  });

  test("GET / supports pagination", async () => {
    const user = await User.create({
      fullName: "Paginator",
      email: "page@example.com",
      password: "password123",
    });

    const blogs = Array.from({ length: 7 }).map((_, i) => ({
      title: `Blog ${i + 1}`,
      body: `Body for blog ${i + 1} with enough content to pass validation.`,
      createdBy: user._id,
    }));
    await Blog.insertMany(blogs);

    const firstPageRes = await request(app).get("/?page=1");
    const secondPageRes = await request(app).get("/?page=2");

    expect(firstPageRes.status).toBe(200);
    expect(firstPageRes.text).toContain("Page 1 of 2");
    expect(secondPageRes.status).toBe(200);
    expect(secondPageRes.text).toContain("Page 2 of 2");
  });
});

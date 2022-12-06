import * as api from "../functions/api/v1/_middleware";

test("responds with hi", async () => {
  const req = new Request("http://localhost/");
  const res = await api.handleRequest(req, "a@cloudflare.com")
  expect(await res.text()).toBe("hi a@cloudflare.com");
});

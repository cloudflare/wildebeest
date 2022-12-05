import app from "../src/index";

test("responds with hi", async () => {
  const res = await app.request('http://localhost/')
  expect(await res.text()).toBe("hi");
});

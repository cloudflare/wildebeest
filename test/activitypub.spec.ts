import { makeDB, assertCache } from "./utils"
import { strict as assert } from "node:assert/strict";

import * as ap_users from "../functions/ap/users/[id]";

describe("ActivityPub", () => {
  test("fetch non-existant user by id", async () => {
    const db = await makeDB();

    const res = await ap_users.handleRequest(db, "nonexisting");
    assert.equal(res.status, 404);
  });

  test("fetch user by id", async () => {
    const db = await makeDB();
    const properties = { summary: "test summary" };
    await db
      .prepare("INSERT INTO actors (id, email, type, properties) VALUES (?, ?, ?, ?)")
      .bind("sven", "sven@cloudflare.com", "Person", JSON.stringify(properties))
      .run();

    const res = await ap_users.handleRequest(db, "sven");
    assert.equal(res.status, 200);

    const data = await res.json<any>();
    assert.equal(data.summary, "test summary");
    assert.equal(data.id, "sven");
  });
});

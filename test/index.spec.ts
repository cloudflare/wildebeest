import { strict as assert } from "node:assert/strict";
import { promises as fs } from "fs";
import { BetaDatabase } from "@miniflare/d1";
import { createSQLiteDB } from "@miniflare/shared";
import * as instance from "../functions/api/v1/instance";
import * as apps from "../functions/api/v1/apps";
import * as oauth_authorize from "../functions/oauth/authorize";
import * as oauth_token from "../functions/oauth/token";
import * as accounts_verify_creds from "../functions/api/v1/accounts/verify_credentials";
import { TEST_JWT, ACCESS_CERTS } from "./test-data";
import  * as Database from 'better-sqlite3';

async function makeDB(): Promise<any> {
  const db = new BetaDatabase(new Database(":memory:"))!;

  // Manually run our migrations since @miniflare/d1 doesn't support it (yet).
  {
    const initial = await fs.readFile("./migrations/0000_initial.sql", "utf-8");

    const stmts = initial.split(";");
    for (let i = 1, len = stmts.length; i < len; i++) {
      try {
        await db.exec(stmts[i].replace(/(\r\n|\n|\r)/gm, ""));
      } catch (err) {}
    }
  }

  return db;
}

function assertCORS(response: Response) {
  assert(response.headers.has("Access-Control-Allow-Origin"));
  assert(response.headers.has("Access-Control-Allow-Headers"));
}

function assertJSON(response: Response) {
  assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
}

function assertCache(response: Response, maxge: number) {
  assert(response.headers.has("cache-control"));
  assert(response.headers.get("cache-control")!.includes("max-age=" + maxge));
}

describe("Mastodon APIs", () => {
  describe("instance", () => {
    test("return the instance infos", async () => {
      const res = await instance.onRequest();
      assert.equal(res.status, 200);
      assertCORS(res);
      assertJSON(res);
      assertCache(res, 180);
    });
  });

  describe("apps", () => {
    test("return the app infos", async () => {
      const res = await apps.onRequest();
      assert.equal(res.status, 200);
      assertCORS(res);
      assertJSON(res);
    });
  });

  describe("accounts", () => {
    test("missing identity", async () => {
      const data = {
        cloudflareAccess: {
          JWT: {
            getIdentity() {
              return null;
            }
          }
        }
      };

      const context: any = { data };
      const res = await accounts_verify_creds.onRequest(context);
      assert.equal(res.status, 401);
    });

    test("verify the credentials", async () => {
      const db = await makeDB();
      await db
        .prepare("INSERT INTO actors (id, email, type) VALUES (?, ?, ?)")
        .bind("1", "sven@cloudflare.com", "Person")
        .run();

      const env = { DATABASE: db };
      const cloudflareAccess = {
        JWT: {
          getIdentity() {
            return {
              email: "sven@cloudflare.com"
            }
          }
        }
      };

      const context: any = { env, data: { cloudflareAccess }};
      const res = await accounts_verify_creds.onRequest(context);
      assert.equal(res.status, 200);
      assertCORS(res);
      assertJSON(res);

      const data = await res.json<any>();
      assert.equal(data.display_name, "sven@cloudflare.com");
    });

    test("missing user", async () => {
      const db = await makeDB();

      const env = { DATABASE: db };
      const cloudflareAccess = {
        JWT: {
          getIdentity() {
            return {
              email: "sven@cloudflare.com"
            }
          }
        }
      };

      const context: any = { env, data: { cloudflareAccess }};
      const res = await accounts_verify_creds.onRequest(context);
      assert.equal(res.status, 404);
    });
  });

  describe("oauth", () => {
    beforeEach(() => {
      globalThis.fetch = async (input: RequestInfo) => {
        if (input === "https://that-test.cloudflareaccess.com/cdn-cgi/access/certs") {
          return new Response(JSON.stringify(ACCESS_CERTS));
        }

        if (input === "https://that-test.cloudflareaccess.com/cdn-cgi/access/get-identity") {
          return new Response(JSON.stringify({
            email: "some@cloudflare.com",
          }));
        }

        throw new Error("unexpected request to " + input);
      };
    });

    test("authorize missing params", async () => {
      const db = await makeDB();

      let req = new Request("https://example.com/oauth/authorize");
      let res = await oauth_authorize.handleRequest(req, db);
      assert.equal(res.status, 400);

      req = new Request("https://example.com/oauth/authorize?scope=foobar");
      res = await oauth_authorize.handleRequest(req, db);
      assert.equal(res.status, 400);
    });

    test("authorize unsupported response_type", async () => {
      const db = await makeDB();

      const params = new URLSearchParams({
        redirect_uri: "https://example.com",
        response_type: "hein",
        client_id: "client_id",
      });

      const req = new Request("https://example.com/oauth/authorize?" + params);
      const res = await oauth_authorize.handleRequest(req, db);
      assert.equal(res.status, 400);
    });

    test("authorize redirects with code on success and creates user", async () => {
      const db = await makeDB();

      const params = new URLSearchParams({
        redirect_uri: "https://example.com",
        response_type: "code",
        client_id: "client_id",
      });

      const headers = {
        "Cf-Access-Jwt-Assertion": TEST_JWT,
      };

      const req = new Request("https://example.com/oauth/authorize?" + params, { headers });
      const res = await oauth_authorize.handleRequest(req, db);
      assert.equal(res.status, 307);

      const location = res.headers.get("location");
      assert.equal(location, "https://example.com/?code=" + TEST_JWT);

      const actor = await db.prepare("SELECT * FROM actors").first();
      assert.equal(actor.email, "some@cloudflare.com");
    });

    test("token returns auth infos", async () => {
      const body = {
        code: "some-code",
      };

      const req = new Request("https://example.com/oauth/token", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const res = await oauth_token.handleRequest(req);
      assert.equal(res.status, 200);
      assertCORS(res);
      assertJSON(res);

      const data = await res.json<any>();
      assert.equal(data.access_token, "some-code");
      assert.equal(data.scope, "read write follow push");
    });
  });
});

import { assert } from "chai";

import { createIORedis } from "../src/index";

describe("IORedis", function () {
  let cluster;
  const value = {
    hello: "world",
  };
  before(async function () {
    cluster = await createIORedis();
  });
  after(async function () {
    await cluster.quit();
  });
  describe("set and get test-key", function () {
    const testKey = "test-key";
    before(async function () {
      await cluster.set(testKey, JSON.stringify(value));
    });
    it("returns the written test key", async function () {
      let userSession = await cluster.get(testKey);
      assert.deepStrictEqual(userSession, JSON.stringify(value));
    });
    it("del key", async function () {
      await cluster.del(testKey);
    });
    it("doesn't return the deleted test key", async function () {
      let userSession = await cluster.get(testKey);
      assert.notOk(userSession);
    });
  });
});

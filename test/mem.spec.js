import { assert } from "chai";

import { MEM } from "../lib/index.js";

describe("MEM", function () {
  let mem;
  const value = {
    hello: "world",
  };
  before(async function () {
    mem = await new MEM().connect();
  });
  after(async function () {
    await mem.quit();
  });
  describe("set and get test-key", function () {
    const testKey = "test-key";
    before(async function () {
      await mem.set(testKey, JSON.stringify(value));
    });
    it("returns the written test key", async function () {
      const userSession = await mem.get(testKey);
      assert.deepStrictEqual(userSession, JSON.stringify(value));
    });
    it("del key", async function () {
      await mem.del(testKey);
    });
    it("doesn't return the deleted test key", async function () {
      const userSession = await mem.get(testKey);
      assert.notOk(userSession);
    });
  });
});

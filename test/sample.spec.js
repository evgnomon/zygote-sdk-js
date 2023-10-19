import { assert } from "chai";

import { connect } from "../src/index";

describe("another case", function () {
  const expected = { hello: "world" };
  let actual = { hello: "world" };
  let conn;
  before(async function () {
    conn = await connect();
    console.log("connected");
    const results = await new Promise((resolve, reject) => {
      conn.query("SELECT 1 + 1 AS solution", function (error, results, fields) {
        if (error) reject(error);
        resolve(results);
      });
    });
    console.log("The solution is: ", results[0].solution);
  });
  after(async function () {
    await conn.end();
  });
  it("returns desired response", function () {
    assert.deepStrictEqual(actual, expected);
  });
});

import util from "util";

import {assert} from "chai";
import dotenv from "dotenv";
import mysql from "mysql";

dotenv.config();

describe("mysql", function () {
  describe("shards", function () {
    let gwHostname;
    before(function () {
      gwHostname = process.env.DOCKER_GATEWAY_HOST;
    });
    describe("one", function () {
      let connection;
      before(function () {
        connection = mysql.createConnection({
          host: process.env.DB_SHARD_1_INTERNAL_HOST || gwHostname,
          poer: parseInt(
            process.env.DB_SHARD_1_INTERNAL_PORT ||
            process.env.DB_SHARD_1_EXTERNAL_PORT
          ),
          user: "test_1",
          password: "password",
          database: "myproject_1",
        });
      });
      after(function () {
        connection.end();
      });
      it("connect", function () {
        connection.connect();
      });
      it("SELECT statement", async function () {
        await new Promise((resolve) => {
          connection.query(
            "SELECT 1 + 1 AS solution",
            function (error, results, fields) {
              assert.isNull(error);
              assert.equal(results[0].solution, 2);
              assert.lengthOf(results, 1);
              assert.lengthOf(fields, 1);
              resolve();
            }
          );
        });
      });
    });

    describe("two", function () {
      let connection;
      before(function () {
        connection = mysql.createConnection({
          host: process.env.DB_SHARD_2_INTERNAL_HOST || gwHostname,
          port: parseInt(
            process.env.DB_SHARD_2_INTERNAL_PORT ||
            process.env.DB_SHARD_2_EXTERNAL_PORT
          ),
          user: "test_2",
          password: "password",
          database: "myproject_2",
        });
      });
      after(function () {
        connection.end();
      });
      it("connect", function () {
        connection.connect();
      });
      it("SELECT statement", async function () {
        await new Promise((resolve) => {
          connection.query(
            "SELECT 1 + 1 AS solution",
            function (error, results, fields) {
              assert.isNull(error);
              assert.equal(results[0].solution, 2);
              assert.lengthOf(results, 1);
              assert.lengthOf(fields, 1);
              resolve();
            }
          );
        });
      });
    });

    describe("describe users table", function () {
      let connections;
      before(function () {
        connections = [
          mysql.createConnection({
            host: process.env.DB_SHARD_1_INTERNAL_HOST || gwHostname,
            port: parseInt(
              process.env.DB_SHARD_1_INTERNAL_PORT ||
              process.env.DB_SHARD_1_EXTERNAL_PORT
            ),
            user: "test_1",
            password: "password",
            database: "myproject_1",
          }),
          mysql.createConnection({
            host: process.env.DB_SHARD_2_INTERNAL_HOST || gwHostname,
            port: parseInt(
              process.env.DB_SHARD_2_INTERNAL_PORT ||
              process.env.DB_SHARD_2_EXTERNAL_PORT
            ),
            user: "test_2",
            password: "password",
            database: "myproject_2",
          })];
      });

      before("connect", function () {
        connections.forEach(c => {
          c.connect();
        });
      });
      after("close connection", function () {
        connections.forEach(c => {
          c.end();
        });
      });
      let actual;
      before(async function () {
        const queries = connections.map(c => util.promisify(c.query).bind(c));
        actual = await Promise.all(queries.map((x) => x("describe users;")));
      });
      it("returns desired columns", async function () {
        assert.lengthOf(actual, 2);
        actual.forEach((a) => {
          assert.deepStrictEqual(a, [
            {
              Field: "id",
              Type: "int unsigned",
              Null: "NO",
              Key: "PRI",
              Default: null,
              Extra: "auto_increment",
            },
            {
              Field: "first_name",
              Type: "varchar(50)",
              Null: "NO",
              Key: "",
              Default: null,
              Extra: "",
            },
            {
              Field: "last_name",
              Type: "varchar(50)",
              Null: "NO",
              Key: "",
              Default: null,
              Extra: "",
            },
            {
              Field: "email",
              Type: "varchar(100)",
              Null: "NO",
              Key: "UNI",
              Default: null,
              Extra: "",
            },
            {
              Field: "password",
              Type: "varchar(255)",
              Null: "NO",
              Key: "",
              Default: null,
              Extra: "",
            },
            {
              Field: "created_at",
              Type: "timestamp",
              Null: "YES",
              Key: "",
              Default: "CURRENT_TIMESTAMP",
              Extra: "DEFAULT_GENERATED",
            },
            {
              Field: "updated_at",
              Type: "timestamp",
              Null: "YES",
              Key: "",
              Default: "CURRENT_TIMESTAMP",
              Extra: "DEFAULT_GENERATED on update CURRENT_TIMESTAMP",
            },
          ]);
        });
      });
    });
  });
});

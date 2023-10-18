import {exec} from "child_process";
import util from 'util';

import {assert} from "chai";
import dotenv from "dotenv";
import Redis from "ioredis";


dotenv.config();

describe("redis", function () {
  let cluster, value;
  let dockerHost;

  before(async function () {
    const redis_port1 = 6373;
    const redis_port2 = redis_port1 + 1;
    const redis_port3 = redis_port1 + 2;
    dockerHost = process.env.DOCKER_GATEWAY_HOST;
    value = {
      name: "John",
      surname: "Smith",
      company: "Redis",
      age: 29,
    };
    const config = {};

    if (!process.env.REDIS_NATMAP_DISABLED) {

      const execP = util.promisify(exec);
      const {stdout: getnetResult} = await execP("docker run --rm --network mynet  ghcr.io/clusterlean/ark:main getent hosts clapp-mem-shard-1 clapp-mem-shard-2 clapp-mem-shard-3");
      const hostMap = getnetResult.split(/\r?\n/)
        .filter((line) => line.length > 0)
        .map((line) => line.split(/\s+/))
        .reduce((acc, [ip, host]) => {
          acc[host] = ip;
          return acc;
        }, {});

      config.natMap = {
        [`${hostMap[process.env.REDIS_SHARD_1_INTERNAL_HOST]}:${process.env.REDIS_PORT}`]:
          {host: dockerHost, port: redis_port1},
        [`${hostMap[process.env.REDIS_SHARD_2_INTERNAL_HOST]}:${process.env.REDIS_PORT}`]:
          {host: dockerHost, port: redis_port2},
        [`${hostMap[process.env.REDIS_SHARD_3_INTERNAL_HOST]}:${process.env.REDIS_PORT}`]:
          {host: dockerHost, port: redis_port3},
      };
    }
    cluster = new Redis.Cluster(
      [
        {
          port: !process.env.REDIS_NATMAP_DISABLED
            ? redis_port1
            : process.env.REDIS_PORT,
          host: !process.env.REDIS_NATMAP_DISABLED
            ? dockerHost
            : process.env.REDIS_SHARD_1_INTERNAL_HOST,
        },
        {
          port: !process.env.REDIS_NATMAP_DISABLED
            ? redis_port2
            : process.env.REDIS_PORT,
          host: !process.env.REDIS_NATMAP_DISABLED
            ? dockerHost
            : process.env.REDIS_SHARD_2_INTERNAL_HOST,
        },
      ],
      config
    );
  });
  after(async function () {
    await cluster.quit();
  });

  describe("cluster client", function () {
    const testKey = "test-key";
    before(async function () {
      await cluster.set(testKey, JSON.stringify(value));
    });
    after(async function () {
      await cluster.del(testKey);
    });
    it("get test key", async function () {
      let userSession = await cluster.get(testKey);
      assert.deepStrictEqual(userSession, JSON.stringify(value));
    });
  });
});

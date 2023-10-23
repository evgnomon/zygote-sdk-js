import { exec } from "node:child_process";
import util from "node:util";

import Redis, { RedisOptions } from "ioredis";
import mysql from "mysql";

export function sayHello() {
  console.log("hi");
}

/**
 * sayGoodbye.
 * @description This is a description.
 */
export function sayGoodbye() {
  console.log("goodbye");
}

// DOCKER_NETWORK_NAME=mynet
// DOCKER_GATEWAY_HOST=127.0.0.1
// DB_SHARD_1_EXTERNAL_PORT= 3306
// DB_SHARD_2_EXTERNAL_PORT= 3307
// REDIS_PORT=6373
// REDIS_SHARD_1_INTERNAL_HOST=clapp-mem-shard-1
// REDIS_SHARD_2_INTERNAL_HOST=clapp-mem-shard-2
// REDIS_SHARD_3_INTERNAL_HOST=clapp-mem-shard-3
// PORT=3000
// HTTP_HOST=localhost

function resolveEndpoint(shard: number) {
  let portNum = 3306 - 1 + shard;
  if (process.env[`DB_SHARD_${shard}_INTERNAL_PORT`]) {
    portNum = parseInt(process.env[`DB_SHARD_${shard}_INTERNAL_PORT`] || "0");
  }
  return {
    host: process.env[`DB_SHARD_${shard}_INTERNAL_HOST`] || "127.0.0.1",
    port: portNum,
  };
}

function createPool(shard: number): Promise<mysql.Pool> {
  return new Promise((resolve, reject) => {
    try {
      const pool = mysql.createPool({
        ...resolveEndpoint(shard),
        user: `test_${shard}`,
        password: "password",
        database: `myproject_${shard}`,
      });
      resolve(pool);
    } catch (e) {
      reject(e);
    }
  });
}

export class DB {
  pool: Promise<mysql.Pool>;
  constructor(shardNum = 1) {
    this.pool = createPool(shardNum);
  }

  async query(sql: string): Promise<[unknown, mysql.FieldInfo[] | undefined]> {
    const pool = await this.pool;
    return new Promise((resolve, reject) => {
      pool.query(sql, (err, results, fields) => {
        if (err) {
          reject(err);
          return;
        }
        resolve([results, fields]);
      });
    });
  }

  async close(): Promise<void> {
    const pool = await this.pool;
    return new Promise((resolve) => {
      pool.end((err) => {
        if (err) {
          console.error(err);
          return;
        }
        resolve(undefined);
      });
    });
  }
}

type IORedisConf = {
  REDIS_PORT: number;
  REDIS_SHARD_1_INTERNAL_HOST: string;
  REDIS_SHARD_2_INTERNAL_HOST: string;
  REDIS_SHARD_3_INTERNAL_HOST: string;
};

export async function createIORedis(conf?: IORedisConf) {
  const ports = [6373, 6374, 6375];
  const dockerHost = "127.0.0.1";
  const config: RedisOptions = {};

  if (!conf) {
    conf = {
      REDIS_SHARD_1_INTERNAL_HOST: "clapp-mem-shard-1",
      REDIS_SHARD_2_INTERNAL_HOST: "clapp-mem-shard-2",
      REDIS_SHARD_3_INTERNAL_HOST: "clapp-mem-shard-3",
      REDIS_PORT: 6373,
    };
  }

  if (!process.env.REDIS_NATMAP_DISABLED) {
    const execP = util.promisify(exec);
    const { stdout: getnetResult } = await execP(
      "docker run --rm --network mynet  ghcr.io/clusterlean/ark:main getent hosts clapp-mem-shard-1 clapp-mem-shard-2 clapp-mem-shard-3"
    );
    const hostMap = getnetResult
      .split(/\r?\n/)
      .filter((line: string) => line.length > 0)
      .map((line: string) => line.split(/\s+/))
      .reduce<{ [key: string]: string }>((acc, [ip, host]) => {
        acc[host] = ip;
        return acc;
      }, {});

    config.natMap = {
      [`${hostMap[conf.REDIS_SHARD_1_INTERNAL_HOST]}:${conf.REDIS_PORT}`]: {
        host: dockerHost,
        port: ports[0],
      },
      [`${hostMap[conf.REDIS_SHARD_2_INTERNAL_HOST]}:${conf.REDIS_PORT}`]: {
        host: dockerHost,
        port: ports[1],
      },
      [`${hostMap[conf.REDIS_SHARD_3_INTERNAL_HOST]}:${conf.REDIS_PORT}`]: {
        host: dockerHost,
        port: ports[2],
      },
    };
  }
  if (!conf?.REDIS_PORT) {
    throw new Error("REDIS_PORT is not set");
  }
  const cluster = new Redis.Cluster(
    [
      {
        port: !process.env.REDIS_NATMAP_DISABLED ? ports[0] : conf.REDIS_PORT,
        host: !process.env.REDIS_NATMAP_DISABLED
          ? dockerHost
          : conf.REDIS_SHARD_1_INTERNAL_HOST,
      },
      {
        port: !process.env.REDIS_NATMAP_DISABLED ? ports[1] : conf.REDIS_PORT,
        host: !process.env.REDIS_NATMAP_DISABLED
          ? dockerHost
          : conf.REDIS_SHARD_2_INTERNAL_HOST,
      },
    ],
    config
  );

  return cluster;
}

import { exec } from "node:child_process";
import util from "node:util";

import Redis from "ioredis";
import mysql from "mysql";

/**
 * @typedef {object} MEMConfig
 * @property {string} MEM_SHARD_1_INTERNAL_HOST - The internal host for MEM shard 1.
 * @property {string} MEM_SHARD_2_INTERNAL_HOST - The internal host for MEM shard 2.
 * @property {string} MEM_SHARD_3_INTERNAL_HOST - The internal host for MEM shard 3.
 * @property {number} MEM_INTERNAL_PORT - The internal port for MEM.
 */

/**
 * @param {number} shard -
 * @returns {{host:string, port:number}} - endpoint
 */
function resolveEndpoint(shard) {
  let portNumber = 3306 - 1 + shard;
  if (process.env[`DB_SHARD_${shard}_INTERNAL_PORT`]) {
    portNumber = Number.parseInt(
      process.env[`DB_SHARD_${shard}_INTERNAL_PORT`] || "0"
    );
  }
  return {
    host: process.env[`DB_SHARD_${shard}_INTERNAL_HOST`] || "127.0.0.1",
    port: portNumber,
  };
}

/**
 * @param {number} shard - shard number
 * @returns {Promise<mysql.Pool>} - mysql pool
 */
function createPool(shard) {
  return new Promise((resolve, reject) => {
    try {
      const pool = mysql.createPool({
        ...resolveEndpoint(shard),
        user: `test_${shard}`,
        password: "password",
        database: `myproject_${shard}`,
      });
      resolve(pool);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * @typedef {import('ioredis').Cluster} RedisCluster
 */
export class DB {
  #pool;

  constructor(shardNumber = 1) {
    this.#pool = createPool(shardNumber);
  }

  /**
   * @param {string} sql - sql
   * @returns {Promise<[unknown, mysql.FieldInfo[]|undefined]>} - [results, fields]
   */
  async query(sql) {
    const pool = await this.#pool;
    return new Promise((resolve, reject) => {
      pool.query(sql, (error, results, fields) => {
        if (error) {
          reject(error);
          return;
        }
        resolve([results, fields]);
      });
    });
  }

  /**
   * @returns {Promise<void>}
   */
  async close() {
    const pool = await this.#pool;
    return new Promise((resolve) => {
      pool.end((error) => {
        if (error) {
          console.error(error);
          return;
        }
        resolve();
      });
    });
  }
}

export class MEM {
  #conf;
  /**
   * @param {MEMConfig} [config] - configuration
   */
  constructor(config) {
    if (!config) {
      config = {
        MEM_SHARD_1_INTERNAL_HOST: "clapp-mem-shard-1",
        MEM_SHARD_2_INTERNAL_HOST: "clapp-mem-shard-2",
        MEM_SHARD_3_INTERNAL_HOST: "clapp-mem-shard-3",
        MEM_INTERNAL_PORT: 6373,
      };
    }
    if (!config.MEM_INTERNAL_PORT) {
      throw new Error("MEM_INTERNAL_PORT is not set");
    }
    if (!config.MEM_SHARD_1_INTERNAL_HOST) {
      throw new Error("MEM_SHARD_1_INTERNAL_HOST is not set");
    }
    if (!config.MEM_SHARD_2_INTERNAL_HOST) {
      throw new Error("MEM_SHARD_2_INTERNAL_HOST is not set");
    }
    if (!config.MEM_SHARD_3_INTERNAL_HOST) {
      throw new Error("MEM_SHARD_3_INTERNAL_HOST is not set");
    }
    this.#conf = config;
  }

  /**
   * @returns {Promise<RedisCluster>} - redisio cluster
   */
  async connect() {
    const ports = [
      this.#conf.MEM_INTERNAL_PORT,
      this.#conf.MEM_INTERNAL_PORT + 1,
      this.#conf.MEM_INTERNAL_PORT + 2,
    ];
    const dockerHost = "127.0.0.1";
    const config = {};

    if (!process.env.REDIS_NATMAP_DISABLED) {
      const execP = util.promisify(exec);
      const { stdout: getnetResult } = await execP(
        "docker run --rm --network mynet  ghcr.io/clusterlean/ark:main getent hosts clapp-mem-shard-1 clapp-mem-shard-2 clapp-mem-shard-3"
      );
      const ipHosts = getnetResult
        .split(/\r?\n/)
        .filter((line) => line.length > 0)
        .map((line) => line.split(/\s+/));

      let hostMap = {};
      for (const [ip, host] of ipHosts) {
        hostMap[host] = ip;
      }

      config.natMap = {
        [`${hostMap[this.#conf.MEM_SHARD_1_INTERNAL_HOST]}:${
          this.#conf.MEM_INTERNAL_PORT
        }`]: {
          host: dockerHost,
          port: ports[0],
        },
        [`${hostMap[this.#conf.MEM_SHARD_2_INTERNAL_HOST]}:${
          this.#conf.MEM_INTERNAL_PORT
        }`]: {
          host: dockerHost,
          port: ports[1],
        },
        [`${hostMap[this.#conf.MEM_SHARD_3_INTERNAL_HOST]}:${
          this.#conf.MEM_INTERNAL_PORT
        }`]: {
          host: dockerHost,
          port: ports[2],
        },
      };
    }

    const cluster = new Redis.Cluster(
      [
        {
          port: process.env.REDIS_NATMAP_DISABLED
            ? this.#conf.MEM_INTERNAL_PORT
            : ports[0],
          host: process.env.REDIS_NATMAP_DISABLED
            ? this.#conf.MEM_SHARD_1_INTERNAL_HOST
            : dockerHost,
        },
        {
          port: process.env.REDIS_NATMAP_DISABLED
            ? this.#conf.MEM_INTERNAL_PORT
            : ports[1],
          host: process.env.REDIS_NATMAP_DISABLED
            ? this.#conf.MEM_SHARD_2_INTERNAL_HOST
            : dockerHost,
        },
      ],
      config
    );

    return cluster;
  }
}

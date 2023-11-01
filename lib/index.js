import { exec } from "node:child_process";
import util from "node:util";

import Redis from "ioredis";
import mysql from "mysql";

/**
 * @typedef {import('ioredis').Cluster} RedisCluster
 */

export class DB {
  #pool;
  resolveEndpoint(shard) {
    let portNum = 3306 - 1 + shard;
    if (process.env[`DB_SHARD_${shard}_INTERNAL_PORT`]) {
      portNum = parseInt(process.env[`DB_SHARD_${shard}_INTERNAL_PORT`] || "0");
    }
    return {
      host: process.env[`DB_SHARD_${shard}_INTERNAL_HOST`] || "127.0.0.1",
      port: portNum,
    };
  }

  createPool(shard) {
    return new Promise((resolve, reject) => {
      try {
        const pool = mysql.createPool({
          ...this.resolveEndpoint(shard),
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

  constructor(shardNum = 1) {
    this.#pool = this.createPool(shardNum);
  }

  /**
   * query.
   * @param {string} sql - sql
   * @returns {Promise<[unknown, mysql.FieldInfo[]|undefined]>} - [results, fields]
   */
  async query(sql) {
    const pool = await this.#pool;
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

  /**
   * close.
   * @returns {Promise<void>}
   */
  async close() {
    const pool = await this.#pool;
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

class MEMConfig {
  /**
   * @type {string}
   */
  MEM_SHARD_1_INTERNAL_HOST;
  /**
   * @type {string}
   */
  MEM_SHARD_2_INTERNAL_HOST;
  /**
   * @type {string}
   */
  MEM_SHARD_3_INTERNAL_HOST;
  /**
   * @type {number}
   */
  MEM_INTERNAL_PORT;
}

export class MEM {
  #conf;
  /**
   * constructor.
   * @param {MEMConfig} [conf] - configuration
   */
  constructor(conf) {
    if (!conf) {
      conf = {
        MEM_SHARD_1_INTERNAL_HOST: "clapp-mem-shard-1",
        MEM_SHARD_2_INTERNAL_HOST: "clapp-mem-shard-2",
        MEM_SHARD_3_INTERNAL_HOST: "clapp-mem-shard-3",
        MEM_INTERNAL_PORT: 6373,
      };
    }
    if (!conf.MEM_INTERNAL_PORT) {
      throw new Error("MEM_INTERNAL_PORT is not set");
    }
    if (!conf.MEM_SHARD_1_INTERNAL_HOST) {
      throw new Error("MEM_SHARD_1_INTERNAL_HOST is not set");
    }
    if (!conf.MEM_SHARD_2_INTERNAL_HOST) {
      throw new Error("MEM_SHARD_2_INTERNAL_HOST is not set");
    }
    if (!conf.MEM_SHARD_3_INTERNAL_HOST) {
      throw new Error("MEM_SHARD_3_INTERNAL_HOST is not set");
    }
    this.#conf = conf;
  }

  /**
   * connect.
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
      const hostMap = getnetResult
        .split(/\r?\n/)
        .filter((line) => line.length > 0)
        .map((line) => line.split(/\s+/))
        .reduce((acc, [ip, host]) => {
          acc[host] = ip;
          return acc;
        }, {});

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
          port: !process.env.REDIS_NATMAP_DISABLED
            ? ports[0]
            : this.#conf.MEM_INTERNAL_PORT,
          host: !process.env.REDIS_NATMAP_DISABLED
            ? dockerHost
            : this.#conf.MEM_SHARD_1_INTERNAL_HOST,
        },
        {
          port: !process.env.REDIS_NATMAP_DISABLED
            ? ports[1]
            : this.#conf.MEM_INTERNAL_PORT,
          host: !process.env.REDIS_NATMAP_DISABLED
            ? dockerHost
            : this.#conf.MEM_SHARD_2_INTERNAL_HOST,
        },
      ],
      config
    );

    return cluster;
  }
}

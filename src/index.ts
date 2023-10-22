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
//

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

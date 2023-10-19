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

const gwHostname = "127.0.0.2";

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

function resolveEndpoint() {
  let portNum = 3306;
  if (process.env.DB_SHARD_1_INTERNAL_PORT) {
    portNum = parseInt(process.env.DB_SHARD_1_INTERNAL_PORT);
  }
  return {
    host: process.env.DB_SHARD_1_INTERNAL_HOST || gwHostname,
    port: portNum,
  };
}

type NumberCallback = (err: unknown, n: mysql.Connection) => unknown;

export function connect(): Promise<mysql.Connection> {
  return new Promise((resolve, reject) => {
    const connection = mysql.createConnection({
      ...resolveEndpoint(),
      user: "test_1",
      password: "password",
      database: "myproject_1",
    });
    connection.connect();
    resolve(connection);
  });
}

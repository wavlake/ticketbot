// Update with your config settings.
const config = require("dotenv").config({ path: "../.env" });

module.exports = {
  development: {
    client: process.env.DB_CLIENT,
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
    },
    pool: {
      min: 0,
      max: 1,
    },
    migrations: {
      tableName: "knex_migrations",
    },
  },
};

import express from "express";
const log = require("loglevel");
const config = require("dotenv").config();
const app = express();
const cors = require("cors");
const compression = require("compression");
const helmet = require("helmet");
const bodyParser = require("body-parser");

const corsHost = process.env.CORS_HOST;
log.setLevel(process.env.LOGLEVEL || "debug");

const corsOptions = {
  origin: { corsHost },
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
};

// BigInt handling issue in Prisma: https://github.com/prisma/studio/issues/614
// eslint-disable-next-line @typescript-eslint/ban-ts-comment      <-- Necessary for my ESLint setup
// @ts-ignore: Unreachable code error                              <-- BigInt does not have `toJSON` method
BigInt.prototype.toJSON = function (): string {
  return this.toString();
};

// Apply middleware
// Note: Keep this at the top, above routes
app.use(helmet());
app.use(compression());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json());
app.use(cors(corsOptions));

// Import routes
import routes from "./src/routes";

// ROUTES
app.use("/v1", routes);

// override default html error page with custom error handler
const port = 8080;
export const server = app.listen(port, () => {
  log.debug(`Ticketbot is listening on port ${port}`);
});

const log = require("loglevel");
log.setLevel(process.env.LOGLEVEL ?? "debug");

const run = async () => {
  log.debug("Running payment monitor...");
};

run();

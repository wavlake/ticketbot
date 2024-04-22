const log = require("loglevel");
import asyncHandler from "express-async-handler";

exports.createZap = asyncHandler(async (req, res, next) => {
  const { eventId, quantity } = req.params;
  log.debug(`Zap! Event ID: ${eventId}, Quantity: ${quantity}`);

  res.status(200).send({ message: "Zap!" });
});

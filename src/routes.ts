const express = require("express");
const { createZap } = require("./controller");

// Create router
const router = express.Router();

//////// ROUTES ////////

router.get("/zap/:eventId/:quantity", createZap);

// Export router
export default router;

const express = require("express");
const { createZap } = require("./controller");

// Create router
const router = express.Router();

//////// ROUTES ////////

router.get("/zap", createZap);

// Export router
export default router;

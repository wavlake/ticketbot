const express = require("express");
const { createZap, getLnurl } = require("./controller");

// Create router
const router = express.Router();

//////// ROUTES ////////

router.get("/zap", createZap);
router.get("/.well-known/lnurlp/rsvp", getLnurl);

// Export router
export default router;

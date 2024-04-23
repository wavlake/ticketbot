const log = require("loglevel");
const dbConfig = require("../db/knexfile");
import knex from "knex";
import asyncHandler from "express-async-handler";
import { Event as NostrEvent } from "nostr-tools/lib/types";
import { verifyEvent } from "nostr-tools";
import { createZapInvoice } from "../lib/invoice";

import { Event } from "../db/types";
const db = knex(dbConfig[process.env.NODE_ENV || "development"]);

const validateRequest = (nostrEvent: NostrEvent, amount: string) => {
  if (!verifyEvent(nostrEvent) || !amount) {
    return false;
  }

  if (isNaN(parseInt(amount))) {
    return false;
  }
  return true;
};

const getEventId = (nostrEvent: NostrEvent) => {
  // Extract event ID from nostr event
  const eventTag = nostrEvent.tags.find((x) => x[0] === "a") || {};
  log.debug(eventTag);
  let eventId;
  try {
    eventId = parseInt(eventTag[1].split(":")[2]);
  } catch (e) {
    return null;
  }
  return eventId;
};

exports.createZap = asyncHandler(async (req, res, next) => {
  const { amount, nostr, lnurl } = req.query;

  // Validate event
  let nostrEvent;
  try {
    nostrEvent = JSON.parse(nostr as string); // Cast 'nostr' as string
  } catch (e) {
    res.status(400).send({ message: "Invalid json" });
    return;
  }

  // Validate params
  const isValid = validateRequest(nostrEvent as NostrEvent, amount as string);
  if (!isValid) {
    res.status(400).send({ message: "Invalid parameters" });
    return;
  }

  // Extract event ID
  const eventId = getEventId(nostrEvent);
  if (!eventId) {
    res.status(400).send({ message: "Invalid event ID" });
    return;
  }

  // Check if event exists and quantity is available
  const data = await db("event").where("id", eventId).first();
  const event: Event = data;

  if (!event) {
    res.status(404).send({ message: "Event not found" });
    return;
  }

  // TODO: Count tickets remaining
  const ticketsRemaining = 2;
  if (ticketsRemaining < 1) {
    res.status(400).send({ message: "Not enough tickets remaining" });
    return;
  }

  // Check amount
  const amountInt = parseInt(amount as string);
  if (amountInt < event.price_msat) {
    res.status(400).send({ message: "Amount too low" });
    return;
  }

  // Generate payment request
  const invoiceResponse = await createZapInvoice(
    event.name,
    eventId,
    amount as string,
    nostr as string
  ).catch((err) => {
    log.error(`Error generating payment request: ${err}`);
    return null;
  });

  await db("zap_request").insert({
    payment_id: invoiceResponse.paymentHash,
    event_id: eventId,
    nostr: nostr,
    is_settled: false,
    created_at: new Date(),
  });

  res.status(200).send({ success: true, pr: invoiceResponse.paymentRequest });
});

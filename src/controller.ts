const log = require("loglevel");
const dbConfig = require("../db/knexfile");
import knex from "knex";
import asyncHandler from "express-async-handler";
import { Event as NostrEvent } from "nostr-tools/lib/types";
import { verifyEvent } from "nostr-tools";
import { createZapInvoice } from "../lib/invoice";
import { getQuantity } from "../lib/nostr";

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
    res.status(400).send({ status: "ERROR", reason: "Invalid json" });
    return;
  }

  // Validate params
  const isValid = validateRequest(nostrEvent as NostrEvent, amount as string);
  if (!isValid) {
    res.status(400).send({ status: "ERROR", reason: "Invalid parameters" });
    return;
  }

  // Extract event ID
  const eventId = getEventId(nostrEvent);
  if (!eventId) {
    res.status(400).send({ status: "ERROR", reason: "Invalid event ID" });
    return;
  }

  // Check if event exists and quantity is available
  const data = await db("event").where("id", eventId).first();
  const event: Event = data;

  if (!event) {
    res.status(404).send({ status: "ERROR", reason: "Event not found" });
    return;
  }

  // Check tickets remaining
  const { ticketsSold } = await db("event_ticket")
    .sum("quantity as ticketsSold")
    .where("event_id", eventId)
    .groupBy("event_id")
    .first();

  const ticketsRemaining =
    event.total_tickets - parseInt(ticketsSold as string);
  log.debug(`Tickets remaining: ${ticketsRemaining}`);
  if (ticketsRemaining < 1) {
    res.status(400).send({ status: "ERROR", reason: "Event is sold out" });
    return;
  }

  const quantity = getQuantity(nostrEvent);
  if (quantity > ticketsRemaining) {
    res
      .status(400)
      .send({
        status: "ERROR",
        reason: "Not enough tickets available, try a lower quantity",
      });
    return;
  }

  if (quantity > event.max_tickets_per_person) {
    res
      .status(400)
      .send({ status: "ERROR", reason: "Quantity exceeds max ticket limit" });
    return;
  }
  // Check amount
  const amountInt = parseInt(amount as string);
  if (amountInt < event.price_msat * quantity) {
    res.status(400).send({ status: "ERROR", reason: "Amount too low" });
    return;
  }

  // Check if user has already purchased a ticket
  const userHasTicket = await db("event_ticket")
    .select("id", "npub")
    .where({ event_id: eventId, npub: nostrEvent.pubkey })
    .first();
  if (userHasTicket) {
    res
      .status(400)
      .send({ status: "ERROR", reason: "User already has ticket" });
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
    res.status(500).send({ status: "ERROR", reason: "Server error" });
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

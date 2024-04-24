const log = require("loglevel");
log.setLevel(process.env.LOGLEVEL || "debug");
const dbConfig = require("@db/knexfile");
import knex from "knex";
const db = knex(dbConfig[process.env.NODE_ENV ?? "development"]);
const { lightning } = require("@lib/lnd");
const randomString = require("randomstring");
import { Event } from "@db/types";
const { getQuantity, createEncryptedMessage } = require("@lib/nostr");
import { useWebSocketImplementation } from "nostr-tools";
useWebSocketImplementation(require("ws"));
import { Relay } from "nostr-tools";

const run = async () => {
  log.debug("Running payment monitor...");
  const { settle_index } = await db("zap_request")
    .max("settle_index as settle_index")
    .first();
  log.debug(`Max index: ${settle_index}`);

  const request = {
    settle_index: settle_index ?? 1,
  };

  let call = lightning.subscribeInvoices(request);
  call.on("data", async function (response) {
    // A response was received from the server.
    // console.log(response);
    const { memo, r_hash, settled, settle_index } = response;
    if (settled && memo.startsWith("Ticket")) {
      log.debug(`Invoice for ticket settled`);
      const paymentHash = Buffer.from(response.r_hash).toString("hex");
      log.debug(`Payment hash: ${paymentHash}`);

      const payment = await processPayment(paymentHash, settle_index);
      if (!payment) {
        return;
      }

      const { eventId, buyerPubkey, quantity } = payment;
      if (buyerPubkey && eventId) {
        issueTicket(eventId, buyerPubkey, quantity, paymentHash);
      }
    }
  });
  call.on("status", function (status) {
    // The current status of the stream.
  });
  call.on("end", function () {
    // The server has closed the stream.
    log.debug("Stream ended");
  });
};

const processPayment = async (paymentHash: string, settleIndex: number) => {
  log.debug(`Processing payment for ${paymentHash}`);

  const zapRequest = await db("zap_request")
    .update({ is_settled: true, settle_index: settleIndex }, [
      "event_id",
      "nostr",
    ])
    .where("payment_id", paymentHash)
    .andWhere("is_settled", false);

  if (!zapRequest || !zapRequest.length) {
    log.error(`No zap found for payment hash ${paymentHash}`);
    return;
  }

  const { event_id, nostr } = zapRequest[0];
  const buyerPubkey = JSON.parse(nostr).pubkey;
  const quantity = getQuantity(JSON.parse(nostr));

  return { eventId: event_id, buyerPubkey: buyerPubkey, quantity: quantity };
};

const issueTicket = async (
  eventId: number,
  buyerPubkey: string,
  quantity: number,
  paymentId: string
) => {
  log.debug(`Issuing ticket for buyer: ${buyerPubkey} event: ${eventId}`);
  const data = await db("event").where("id", eventId).first();
  const event: Event = data;

  const ticketId = await generateTicketId();
  await db("event_ticket").insert({
    id: ticketId,
    event_id: eventId,
    npub: buyerPubkey,
    quantity: quantity,
    payment_id: paymentId,
    is_used: false,
    created_at: new Date(),
  });

  // Send DM to buyer
  const relay = await Relay.connect(process.env.RELAY_URL);
  log.debug(`Connected to ${relay.url}`);

  const signedEvent = await createEncryptedMessage(
    `Thanks for purchasing a ticket to ${event.name}! Use this unique ticket code to get into the event: ${ticketId}`,
    buyerPubkey
  );
  await relay.publish(signedEvent);
  relay.close();
  return;
};

const generateTicketId = async () => {
  const newId = randomString.generate(12);
  const exists = await db("event_ticket").where("id", newId).first();
  if (exists) {
    return generateTicketId();
  }
  return newId;
};

run();

const log = require("loglevel");
log.setLevel(process.env.LOGLEVEL || "debug");
const dbConfig = require("@db/knexfile");
import knex from "knex";
const db = knex(dbConfig[process.env.NODE_ENV ?? "development"]);
const { lightning } = require("@lib/lnd");
const randomString = require("randomstring");
import { Event } from "@db/types";
const {
  getQuantity,
  createEncryptedMessage,
  createZapReceipt,
} = require("@lib/nostr");
import { useWebSocketImplementation } from "nostr-tools";
useWebSocketImplementation(require("ws"));
import { Relay } from "nostr-tools";

const daysOfTheWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const prettifyDateString = (x: string) => {
  const date = new Date(x);
  const day = daysOfTheWeek[date.getDay()];
  const month = date.toLocaleString("default", { month: "short" });
  const dayOfMonth = date.getDate();
  const year = date.getFullYear();
  return `${day}, ${month} ${dayOfMonth}, ${year}`;
};

const prettifyTimeString = (x: string) => {
  // Remove leading 0 from string if it exists
  return x.replace(/^0/, "");
};

const normalizeTimeString = (x: string) => {
  // Remove trailing AM or PM from string if it exists
  return x.replace(/(AM|PM)$/, "").trim();
};

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
      const { payment_request, settle_date } = response;
      const paymentHash = Buffer.from(response.r_hash).toString("hex");
      const preimage = Buffer.from(response.r_preimage).toString("hex");

      const payment = await processPayment(
        paymentHash,
        settle_index,
        payment_request as string,
        preimage,
        settle_date as number
      );
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

const processPayment = async (
  paymentHash: string,
  settleIndex: number,
  paymentRequest: string,
  preimage: string,
  settle_date: number
) => {
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
  try {
    log.debug("Publishing zap receipt");
    const relay = await Relay.connect(process.env.RELAY_URL);
    const receipt = await createZapReceipt(
      nostr,
      paymentRequest,
      preimage,
      settle_date
    );
    await relay.publish(receipt);
    relay.close();
  } catch (e) {
    log.error(`Error issuing zap receipt: ${e}`);
  }

  return {
    eventId: event_id,
    buyerPubkey: buyerPubkey,
    quantity: quantity,
  };
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

  const message = `
    Thanks for purchasing a ticket to ${event.name}!

    Here's your unique ticket code to get into the event: ${ticketId}
    
    Details: ${prettifyDateString(event.date_start_str)}, ${prettifyTimeString(
    event.time_start_str
  )} at ${event.location}

    Quantity: ${quantity}
    
    Enjoy the event!
    
    
    | ${event.name} | ${event.date_start_str} ${normalizeTimeString(
    event.time_start_str
  )} | ${event.location}  | ${ticketId} | ${quantity} | ${event.id}`;

  const signedEvent = await createEncryptedMessage(message, buyerPubkey);
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

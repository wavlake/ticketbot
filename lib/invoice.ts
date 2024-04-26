const log = require("loglevel");
const dbConfig = require("../db/knexfile");
import knex from "knex";
const db = knex(dbConfig[process.env.NODE_ENV || "development"]);
import crypto from "crypto";
const { getEventHash, signEvent } = require("nostr-tools");
const { lightning } = require("./lnd");

const INVOICE_EXPIRY_TIME = 3600;

export const createZapInvoice = async (
  eventName: string,
  eventId: number,
  msatAmount: string,
  eventString: string
): Promise<any> => {
  const hash = crypto.createHash("sha256");
  log.debug(`Creating invoice for event: ${eventName} id:${eventId}`);

  const descriptionHash = Buffer.from(hash.update(eventString).digest());
  log.debug(`Description hash: ${descriptionHash.toString("hex")}`);

  let request = {
    memo: `Ticket for ${eventName} id:${eventId}`,
    value_msat: msatAmount, // Convert to msat
    expiry: INVOICE_EXPIRY_TIME,
    description_hash: descriptionHash,
    private: true, // To support route hints
  };

  return new Promise((resolve, reject) => {
    lightning.addInvoice(request, function (err, response) {
      if (err) {
        reject(err);
        throw new Error(`Error creating payment request: ${err}`);
      }
      if (response && response.payment_request) {
        resolve({
          paymentRequest: response.payment_request,
          paymentHash: Buffer.from(response.r_hash).toString("hex"),
        });
      } else {
        reject("Error creating payment request");
        throw new Error("Error creating payment request");
      }
    });
  });
};

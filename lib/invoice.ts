const log = require("loglevel");
const dbConfig = require("../db/knexfile");
import knex from "knex";
const db = knex(dbConfig[process.env.NODE_ENV || "development"]);
import crypto from "crypto";
const { getEventHash, signEvent } = require("nostr-tools");
const { lightning } = require("./lnd");

const INVOICE_EXPIRY_TIME = 3600;

// const getZapRequestEvent = async (rHashStr) => {
//   return db
//     .knex("zap_request")
//     .where("payment_hash", "=", rHashStr)
//     .first()
//     .then((data) => {
//       if (data) {
//         return data.event;
//       }
//       return null;
//     })
//     .catch((err) => {
//       log.error(
//         `Error finding zap request event using rHashStr ${rHashStr}: ${err}`
//       );
//       return null;
//     });
// };

// const publishZap = async (
//   relay,
//   serverSecret,
//   serverPubkey,
//   zapRequestEvent,
//   paymentRequest,
//   preimage,
//   settledAt
// ) => {
//   await relay.connect();
//   const eTag = zapRequestEvent.tags.find((x) => x[0] === "e");
//   const aTag = zapRequestEvent.tags.find((x) => x[0] === "a");
//   const pTag = zapRequestEvent.tags.find((x) => x[0] === "p");

//   if (!aTag && !eTag) {
//     log.error("No e or a tag found");
//   }

//   let event = {
//     kind: 9735,
//     pubkey: serverPubkey,
//     created_at: parseInt(settledAt),
//     tags: [
//       ["bolt11", paymentRequest],
//       ["description", JSON.stringify(zapRequestEvent)],
//       ["preimage", preimage],
//       ...(pTag ? [pTag] : []),
//       ...(aTag ? [aTag] : []),
//       ...(eTag ? [eTag] : []),
//     ],
//     content: "",
//   };

//   log.debug(event);
//   event.id = getEventHash(event);
//   event.sig = signEvent(event, serverSecret);

//   // log.debug(event);

//   await relay.publish(event);
//   log.debug("Published event response");
// };

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
    memo: `Ticket: ${eventName} id:${eventId}`,
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

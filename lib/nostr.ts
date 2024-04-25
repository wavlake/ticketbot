const log = require("loglevel");
import { Event as NostrEvent, VerifiedEvent } from "nostr-tools/lib/types";
import { finalizeEvent, getPublicKey, nip04 } from "nostr-tools";
import { hexToBytes } from "@noble/hashes/utils";

const SECRET_KEY_BYTES = hexToBytes(process.env.SECRET_KEY);
const PUBLIC_KEY_HEX = getPublicKey(SECRET_KEY_BYTES);

export const getQuantity = (nostrEvent: NostrEvent): number => {
  const quantityTag = nostrEvent.tags.find((x) => x[0] === "quantity") || {};
  let quantity;
  try {
    quantity = parseInt(quantityTag[1]);
  } catch (e) {
    return 1;
  }
  return quantity;
};

export const createEncryptedMessage = async (
  message: string,
  recipientPublicKey: string
): Promise<VerifiedEvent> => {
  const encryptedContent = await nip04.encrypt(
    SECRET_KEY_BYTES,
    recipientPublicKey,
    message
  );

  let event = {
    created_at: Math.floor(Date.now() / 1000),
    kind: 4,
    tags: [["p", recipientPublicKey]],
    content: encryptedContent,
  };

  return finalizeEvent(event, SECRET_KEY_BYTES);
};

export const createZapReceipt = async (
  zapRequestEvent: string,
  paymentRequest: string,
  preimage: string,
  settle_date: number
) => {
  let zapRequestEventObj;
  try {
    zapRequestEventObj = JSON.parse(zapRequestEvent);
  } catch (e) {
    log.error(`Error parsing zap request event: ${e}`);
    return;
  }

  const aTag = zapRequestEventObj.tags.find((x) => x[0] === "a");

  if (!aTag) {
    log.error("No a tag found");
    return;
  }

  let event = {
    created_at: Math.floor(settle_date),
    kind: 9735,
    tags: [
      ["p", PUBLIC_KEY_HEX],
      ["bolt11", `${paymentRequest}`],
      ["description", `${zapRequestEvent}`],
      ["preimage", `${preimage}`],
      aTag,
    ],
    content: "",
  };

  return finalizeEvent(event, SECRET_KEY_BYTES);
};

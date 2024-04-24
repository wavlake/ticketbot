import { Event as NostrEvent, VerifiedEvent } from "nostr-tools/lib/types";
import {
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  nip04,
} from "nostr-tools";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";

const SECRET_KEY_HEX = process.env.SECRET_KEY;
const SECRET_KEY_BYTES = hexToBytes(process.env.SECRET_KEY);
const PUBLIC_KEY_HEX = getPublicKey(SECRET_KEY_BYTES);
const PUBLIC_KEY_BYTES = hexToBytes(PUBLIC_KEY_HEX);

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
    pubkey: PUBLIC_KEY_HEX,
    created_at: Math.floor(Date.now() / 1000),
    kind: 4,
    tags: [["p", recipientPublicKey]],
    content: encryptedContent,
  };

  // TODO: Issue zap receipt, but is it necessary?

  return finalizeEvent(event, SECRET_KEY_BYTES);
};

import { getPublicKey } from "nostr-tools";
import { hexToBytes } from "@noble/hashes/utils";

const SECRET_KEY_BYTES = hexToBytes(process.env.SECRET_KEY);
const PUBLIC_KEY_HEX = getPublicKey(SECRET_KEY_BYTES);

//// LNURL

const MAX_SENDABLE = 100000000; // Max millisatoshi amount LN SERVICE is willing to receive
const MIN_SENDABLE = 1000; // Min millisatoshi amount LN SERVICE is willing to receive, can not be less than 1 or more than `maxSendable`
const DOMAIN = "https://tickets.wavlake.com/v1/zap";
const WAVLAKE_BASE_64_PNG =
  "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";
const metadata = JSON.stringify([
  ["text/plain", "Wavlaket ticketbot"],
  ["image/png;base64", WAVLAKE_BASE_64_PNG],
]);

export const lnurlResponse = {
  callback: `${DOMAIN}`, // The URL from LN SERVICE which will accept the pay request parameters
  maxSendable: MAX_SENDABLE,
  minSendable: MIN_SENDABLE,
  metadata: metadata, // Metadata json which must be presented as raw string here, this is required to pass signature verification at a later step
  tag: "payRequest", // Type of LNURL
  allowsNostr: true,
  nostrPubkey: `${PUBLIC_KEY_HEX}`,
};

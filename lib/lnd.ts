const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const fs = require("fs");
const path = require("path");

const config = {
  macaroon: process.env.MACAROON,
  tls: process.env.TLS_PATH,
  lnd_host: process.env.LND_HOST,
  lnd_port: process.env.LND_PORT,
};

//// gRPC INITIALIZATION
process.env.GRPC_SSL_CIPHER_SUITES = "HIGH+ECDSA";

// We need to give the proto loader some extra options, otherwise the code won't
// fully work with lnd.
const loaderOptions = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};
const packageDefinition = protoLoader.loadSync(
  path.join(__dirname, "lightning.proto"),
  loaderOptions
);
const lnrpc = grpc.loadPackageDefinition(packageDefinition).lnrpc as any;

// Build meta data credentials
let macaroon = config.macaroon;
let metadata = new grpc.Metadata();
metadata.add("macaroon", macaroon);
let macaroonCreds = grpc.credentials.createFromMetadataGenerator(
  (_args, callback) => {
    callback(null, metadata);
  }
);

// Combine credentials
let lndCert = fs.readFileSync(config.tls);
let sslCreds = grpc.credentials.createSsl(lndCert);
let credentials = grpc.credentials.combineChannelCredentials(
  sslCreds,
  macaroonCreds
);

// Create lightning interface
const lightning = new lnrpc.Lightning(
  `${config.lnd_host}:${config.lnd_port}`,
  credentials
);

module.exports = {
  lightning,
};

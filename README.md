## Getting Started

This project depends on a running instance of LND. This can be handled locally with the [Polar](https://lightningpolar.com/) dev environment. See Polar Setup section for more info.

From the project root run `docker compose up --build`

You can drop the `build` flag if the containers have already been created.

## Development

The following applies to both the project root and `payments` directory:

Install packages:
`npm install`

Run:
`npm run dev`

Note: Any `dist` and `node_modules` directory artifacts should be deleted before running `docker compose build` as they will interfere with the container build.

## Polar Setup

In order for the containers to be able to reach an LND node in Polar, the `tls.cert` has to contain a reference to `host.docker.internal.` for the grpc client to be able to establish a secure connection.

Once you have an LND node running, go to the Advanced Node Options and add the flag `--tlsextradomain=host.docker.internal.` to the node's config. Then, find the old `tls.cert` and `tls.key` on your machine and delete them.

Restart the node. A new cert and key will be created and you can now reference the cert in the `.env`.

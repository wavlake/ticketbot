# Ticketbot

This is POC ticketing agent built for Lightning and Nostr. The idea behind it is to allow an event organizer to sell tickets for an event using zaps as the payment mechanism and DM's for ticket delivery.

The event can be published as a standard note that contains all the metadata needed for any client to zap it and receive a ticket via DM. The note for the event is an extension of the [NIP-52](https://github.com/nostr-protocol/nips/blob/master/52.md) Calendar Event.

This application does not handle the publishing of event notes. The only requirement is the `id` for the event in the local database must be set as the `d` tag in the note. That identifier is then sent as part of the coordinates in the `a` tag of the zap request, per [the spec](https://github.com/nostr-protocol/nips/blob/master/52.md).

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

## Running as a Service

```
$ nano /etc/systemd/system/ticketbot.service

[Unit]
Description=ticketbot
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
Restart=always
RestartSec=5
User=michael
WorkingDirectory=/home/michael/ticketbot
ExecStart=/home/michael/ticketbot/scripts/start
ExecStop=/home/michael/ticketbot/scripts/stop

[Install]
WantedBy=multi-user.target
```

And then:

```
systemctl enable ticketbot
systemctl start ticketbot
```

The logs can be followed with:

```
journalctl -f -u ticketbot
```

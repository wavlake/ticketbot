exports.up = function (knex) {
  return knex.schema
    .createTable("event", function (table) {
      table.integer("id").primary().unique();
      table.string("name", 255).notNullable();
      table.string("location", 255).notNullable();
      table.string("description", 255).notNullable();
      table.integer("price_msat").notNullable();
      table.integer("total_tickets").notNullable();
      table.integer("max_tickets_per_person").notNullable();
      table.timestamp("dt_start");
      table.timestamp("dt_end");
    })

    .createTable("event_person", function (table) {
      table.increments("id").primary().unique();
      table.integer("event_id").notNullable();
      table.string("npub").notNullable().index("idx_event_person_npub");
      table.timestamp("created_at");

      table.foreign("event_id").references("event.id");
    })

    .createTable("zap_request", function (table) {
      table
        .string("payment_id", 255)
        .primary()
        .unique()
        .index("idx_zap_request_payment_id");
      table.integer("event_id").notNullable();
      table.string("nostr", 2000).notNullable();
      table.boolean("is_settled").notNullable();
      table.integer("settle_index");
      table.timestamp("created_at");
      table.timestamp("updated_at");

      table.foreign("event_id").references("event.id");
    })

    .createTable("event_ticket", function (table) {
      table.string("id", 12).primary().unique();
      table.integer("event_id").notNullable();
      table.string("payment_id", 255).unique();
      table.string("npub").notNullable();
      table.boolean("is_used").notNullable();
      table.timestamp("created_at");
      table.timestamp("used_at").nullable();

      table.foreign("payment_id").references("zap_request.payment_id");
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists("event_person")
    .dropTableIfExists("event_ticket")
    .dropTableIfExists("event")
    .dropTableIfExists("zap_request");
};

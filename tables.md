Table users {
id uuid [primary key]
email varchar [unique, not null]
password_hash varchar [not null]
first_name varchar [not null]
last_name varchar [not null]
created_at timestamp [default: `now()`]
}

Table venues {
id uuid [primary key]
name varchar [not null]
address varchar [not null]
created_at timestamp [default: `now()`]
}

Table events {
id uuid [primary key]
venue_id uuid [not null]
title varchar [not null]
start_time timestamp [not null]
created_at timestamp [default: `now()`]
}

Table sections {
id uuid [primary key]
event_id uuid [not null]
name varchar [not null]
price decimal [not null]
}

Table orders {
id uuid [primary key]
user_id uuid
event_id uuid [not null]
total_amount decimal [not null]
status varchar [not null] // e.g., 'pending', 'completed', 'failed'
created_at timestamp [default: `now()`]
}

Table seats {
id uuid [primary key]
section_id uuid [not null]
order_id uuid // This is NULL until someone buys the seat
row_identifier varchar [not null] // e.g., 'A'
seat_number varchar [not null] // e.g., '12'
status varchar [not null, default: 'available'] // 'available', 'locked', 'sold'
}

// ----------------------------------------------
// RELATIONSHIPS (FOREIGN KEYS)
// ----------------------------------------------

// If a venue is deleted, delete all its events.
Ref: events.venue_id > venues.id [delete: cascade]

// If an event is deleted, delete all its sections.
Ref: sections.event_id > events.id [delete: cascade]

// If a section is deleted, delete all its seats.
Ref: seats.section_id > sections.id [delete: cascade]

// If a user deletes their account, DO NOT delete the order (ruins financials). Set to NULL.
Ref: orders.user_id > users.id [delete: set null]

// Cannot delete an event if there are existing orders for it.
Ref: orders.event_id > events.id [delete: restrict]

// A seat is assigned to an order when purchased.
Ref: seats.order_id > orders.id [delete: set null]

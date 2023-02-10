-- Migration number: 0002 	 2023-01-16T13:46:54.975Z

ALTER TABLE outbox_objects
  ADD target TEXT NOT NULL DEFAULT 'https://www.w3.org/ns/activitystreams#Public';

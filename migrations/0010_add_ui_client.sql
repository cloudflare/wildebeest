-- Migration number: 0010 	 2023-03-08T09:40:30.734Z

INSERT INTO clients (id, secret, name, redirect_uris, scopes)
VALUES ('924801be-d211-495d-8cac-e73503413af8', hex(randomblob(42)), 'Wildebeest User Interface', '/', 'all');

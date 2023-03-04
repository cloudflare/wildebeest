-- Migration number: 0010    2023-03-03T20:58:08.319Z

UPDATE actors AS a SET properties = json_insert(a.properties,'$.inbox', a.id || '/inbox');
UPDATE actors AS a SET properties = json_insert(a.properties,'$.outbox', a.id || '/outbox');
UPDATE actors AS a SET properties = json_insert(a.properties,'$.following', a.id || '/following');
UPDATE actors AS a SET properties = json_insert(a.properties,'$.followers', a.id || '/followers');

-- Migration number: 0009    2023-02-28T13:58:08.319Z

ALTER TABLE actors
  ADD is_admin INTEGER;

UPDATE actors SET is_admin = 1
WHERE id = 
    (SELECT id
    FROM actors
    ORDER BY  cdate ASC LIMIT 1 );

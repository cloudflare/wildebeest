// Prepared statements for Mastodon Account API endpoints
export const mastodonAccountStatisticsQuery = `
SELECT
  (
    SELECT COUNT(outbox.object_id)
    FROM outbox_objects AS outbox
    LEFT JOIN objects AS notes ON 
      outbox.target='https://www.w3.org/ns/activitystreams#Public' AND 
      notes.type = 'Note' AND 
      outbox.object_id = notes.id
    WHERE
      notes.id IS NOT NULL AND
      outbox.actor_id=?
    GROUP BY outbox.object_id
  ) AS statuses_count,
  (
    SELECT COUNT(relationships.id)
    FROM actor_following AS relationships
    WHERE relationships.target_actor_id=?
    GROUP BY relationships.id
  ) AS followers_count,
  (
    SELECT COUNT(relationships.id)
    FROM actor_following AS relationships
    WHERE relationships.actor_id=?
    GROUP BY relationships.id
  ) AS following_count
;`

export const findMastodonAccountIDByEmailQuery = `
SELECT
  id
FROM actors
WHERE
  email=?
ORDER BY cdate DESC
LIMIT 1
;`

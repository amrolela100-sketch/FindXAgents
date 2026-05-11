-- notifications table: per-user, cross-device, realtime
CREATE TABLE IF NOT EXISTS "notifications" (
  "id"          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id"     text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type"        text NOT NULL DEFAULT 'pipeline_complete',
  "title"       text NOT NULL,
  "body"        text NOT NULL DEFAULT '',
  "meta"        jsonb NOT NULL DEFAULT '{}',
  "read"        boolean NOT NULL DEFAULT false,
  "created_at"  timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_notifications_user_id"    ON "notifications"("user_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_created_at" ON "notifications"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_notifications_read"       ON "notifications"("user_id", "read");

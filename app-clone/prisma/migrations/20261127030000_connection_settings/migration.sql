-- Connections screen: per-connection app preferences (data permissions +
-- sync frequency per catalog app, plus a reconnect stamp) live on the
-- connection row itself, keyed by catalog app id inside the JSON.
ALTER TABLE "connection" ADD COLUMN "settings" JSONB;

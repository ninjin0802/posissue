-- docs/spec/05-data-model.html（v1.2 承認モード）
-- approval: 1 = 承認してから起票、0 = 即時起票。新規は公開リポジトリなら 1、非公開なら 0（アプリ側で決める）
ALTER TABLE projects ADD COLUMN approval INTEGER NOT NULL DEFAULT 0;
CREATE TABLE pending (
  id         TEXT PRIMARY KEY,           -- ランダム
  key        TEXT NOT NULL,              -- projects.key
  issue      TEXT NOT NULL,              -- 起票する内容（無害化済みの title/body/labels の JSON）
  created_at INTEGER NOT NULL            -- epoch 秒。14 日で削除
);
CREATE INDEX pending_key ON pending(key, created_at);

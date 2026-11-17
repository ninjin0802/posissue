-- docs/spec/05-data-model.html（v1.5 作者ごとのフォームの型）
-- forms: 管理画面で設定したフォームの型（FormTemplate[] の JSON）。NULL なら標準のフォーム
ALTER TABLE projects ADD COLUMN forms TEXT;

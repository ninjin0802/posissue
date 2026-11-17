// 公式ホスト。設定を渡すだけ（docs/spec/03-packages.html 3.3）
import { createHandler } from "@posissue/server";

export default createHandler({ limits: { projectPerDay: 50 } });

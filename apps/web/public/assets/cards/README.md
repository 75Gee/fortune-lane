# 机会与命运卡背

采用用户确认的卡通简约方案：机会为黄底、白边、问号；命运为粉底、白边、感叹号。卡片中的黑色描边和白色装饰保留原图效果，不叠加英文、徽章或其他图案。

来源：用户提供的 `ChatGPT Image 2026年9月11日 15_46_41.png`，原图1536×1024，左右两宫格。原文件保留在用户 Downloads 中。

- 左图裁切：`x=78, y=37, width=660, height=908`。
- 右图裁切：`x=798, y=37, width=660, height=908`。
- 只清除与裁切边缘连通的外部浅色背景，保留黑色外轮廓内的白色边框与符号。
- 导出512×704、带Alpha的WebP，质量0.93。机会约24 KB，命运约22 KB；三张候选卡复用同一图片。

统一入口：`src/components/CardDeckArt.tsx`。卡片名称只在弹窗标题显示一次，图片下方只保留序号；旁观时保持卡背全色，只禁用选择操作。倒计时放在标题右侧，仅当前玩家且有计时限制时显示超时后果。牌堆统计留在牌库，抽卡弹窗不放功能介绍。UI配色定义于 `global.css` 的 `.deck-chance`、`.deck-fate`。

开发环境实际界面预览：`/?scene=game&deck=chance`、`/?scene=game&deck=fate`。加 `&viewer=alan` 可查看其他玩家抽卡时的界面。

启动前端后，在仓库根目录运行 `node apps/web/scripts/render-card-preview.mjs` 可导出桌面和手机实际界面到 `docs/previews/card-backs-in-game.png`、`docs/previews/card-backs-mobile.png`。

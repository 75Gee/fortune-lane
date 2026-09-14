# 大富翁世界之旅

供 2～6 名朋友联机游玩的回合制房地产桌游。规则采用华语地区常见的
简化玩法：不要求集齐同色地产，停在自己的地产时可以升级一级。
地图共有44格，包含两处随机道具补给、24块地产和医院，支持乌龟卡、自选骰子、路障卡和炸弹卡。

## 本地运行

需要 Node.js 24 和 pnpm 11。

```bash
pnpm install
pnpm dev
```

开发页面默认运行在 Vite 输出的地址。生产模式由一个 Node.js 进程同时
提供网页和联机服务：

```bash
pnpm build
pnpm start
```

默认地址为 `http://localhost:3001`。同一局域网的朋友可以访问运行机器的
局域网 IP 和 `3001` 端口，再通过六位房间码加入。

## 文档

- [游戏规则](./docs/rules.md)
- [技术与视觉设计](./docs/technical-design.md)
- [重构实施计划](./docs/refactor-plan.md)

房间和对局只保存在服务端内存中；服务重启后不会恢复旧对局。


## 新增棋盘模型

游戏采用柔和接地投影，保留原有模型与文字精度；棋盘静止时暂停绘制，骰子按需渲染，转盘使用八格 SVG 平面动画。优化后的实际界面：[游戏效果图](./docs/previews/game-contact-shadows.png)。

开发环境 `?scene=game` 使用真实游戏组件展示本地演示局面。重新导出界面图：`node apps/web/scripts/render-game-preview.mjs http://127.0.0.1:5173/`。

道具补给站、开罗金字塔庭院、香港维港建筑群与医院都已接入游戏。
可查看 [模型预览图](./apps/web/public/assets/models/preview.png) 和 [GLB文件说明](./apps/web/public/assets/models/README.md)。
开发环境在页面地址后加 `?scene=models`，可旋转查看补给站、开罗、香港、医院、路障和炸弹六个模型并下载GLB；`?scene=items`、`?scene=cairo`、`?scene=hong-kong`、`?scene=hospital` 可查看棋盘中的实际位置。

重新导出模型：`pnpm --filter @fortune/server exec tsx ../web/scripts/export-models.ts`。
启动网页开发服务后，可执行 `node apps/web/scripts/render-model-preview.mjs http://127.0.0.1:5173/` 生成预览图（端口按实际服务调整）。


## 卡牌与旅行战报

机会、命运各32张，包含城市旅行、旅费收支、道具、慢行和住院效果。卡面只呈现旅行原因与本次结算结果；[全部卡牌文案](./docs/card-catalog.md)。

游戏结束后展示名次、趣味称号和可展开的个人统计、旅途名场面。统计随整局累计，重连保留，新局清零。[手机战报预览（示例数据）](./docs/previews/trip-report-mobile.png)。

本地开发可访问 `?scene=game&result=1` 查看战报美术预览，或 `?scene=game&card=chance-renovate` 查看指定卡牌的结算展示。导出截图：`node apps/web/scripts/render-trip-report.mjs`。

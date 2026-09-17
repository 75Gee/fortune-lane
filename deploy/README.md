# 无数据库部署（Node.js + systemd）

适用于使用 systemd 的 Linux 服务器。一个 Node.js 24 进程提供网页与 Socket.IO 服务，沿用现有 Nginx / HTTPS，不需要 Docker 或数据库。房间仍保存在内存中，重启、发布或回滚都会清空对局。不要启用多实例或集群模式。

2026-09-16 已完成线上迁移：`https://monopoly.75gee.fun` 使用本说明的原生服务。运行时为 Node.js 24.21.0，服务路径 `/usr/local/bin/node`，当前发布目录由 `/opt/monopoly-world-tour/current` 指向。旧大富翁容器仅作停止状态的回滚备份；服务器其他应用仍使用 Docker。

以下命令用于后续发布或重新安装；发布会清空内存房间。

## 准备发布目录

在构建机器安装 Node.js 24 和项目指定的 pnpm 11.18.0。在项目根目录构建并打包，使用一个尚不存在的绝对路径作为发布目录：

```sh
pnpm install --frozen-lockfile
pnpm build
release_dir=/absolute/path/to/releases/20260916-01
mkdir -p "$release_dir/apps"
pnpm --filter @fortune/server deploy --prod --legacy "$release_dir/apps/server"
mkdir -p "$release_dir/apps/web"
cp -R apps/web/dist "$release_dir/apps/web/dist"
```

把整个发布目录上传到服务器的 `/opt/monopoly-world-tour/releases/<版本>`。保留 `apps/server` 与 `apps/web/dist` 的相对位置；后端依靠这个目录结构定位前端资源。生产依赖应在与服务器兼容的操作系统和架构上准备。本次包中的生产依赖均为纯 JavaScript，未包含 `.node` 原生模块，可在 Linux 运行；以后若引入原生模块，应改在对应 Linux 架构准备依赖。

上传前检查符号链接不能指回构建机。pnpm legacy deploy 在当前版本可能把 `apps/server/node_modules/.pnpm/node_modules/@fortune/server` 指向原工作区，必须将该自引用链接改成指向发布包中的 `apps/server`，其余链接也应全部在发布目录内。macOS 打包使用 `tar --no-xattrs --no-mac-metadata`，避免携带扩展属性。运行服务器只需要 Node.js，不需要 pnpm 或前端开发服务。

## 首次安装与切换

服务器安装 Node.js 24，确认 `node --version` 和 `command -v node`；服务文件默认使用 `/usr/local/bin/node`，路径不同时修改 `ExecStart`。不要使用位于个人 home 目录的 Node，因为服务启用了 `ProtectHome`。

创建专用系统用户（已有时跳过）：

```sh
sudo useradd --system --user-group --home-dir /nonexistent --shell /usr/sbin/nologin monopoly
```

发布目录由管理员持有，确保 `monopoly` 用户可以遍历目录、读取资源和依赖。将仓库中的 `deploy/monopoly-world-tour.service` 安装到服务器：

```sh
sudo install -m 644 deploy/monopoly-world-tour.service /etc/systemd/system/monopoly-world-tour.service
sudo ln -s /opt/monopoly-world-tour/releases/<版本> /opt/monopoly-world-tour/current
sudo systemctl daemon-reload
```

首次从 Docker 迁移时不要直接启动：旧 Docker 容器可能仍占用 3001 端口。在允许中断对局的发布窗口停止旧容器，关闭其自动重启，再启动新服务：

```sh
sudo docker update --restart=no monopoly-world-tour
sudo docker stop monopoly-world-tour
sudo systemctl enable --now monopoly-world-tour
```

继续使用现有 Nginx 的 HTTPS 配置及指向 `127.0.0.1:3001` 的代理。仓库的 `nginx-monopoly.conf` 仅提供 HTTP 代理示例，不要用它覆盖线上的证书配置。systemd 设置 `HOST=127.0.0.1`，应用端口只监听本机。

手动确认服务状态、`/health`、网页资源及联机功能后，再决定何时清理旧镜像。不要为此卸载可能仍承载其他应用的 Docker。

## 日常运维

```sh
sudo systemctl status monopoly-world-tour
sudo journalctl -u monopoly-world-tour -n 100 --no-pager
sudo journalctl -u monopoly-world-tour -f
sudo systemctl restart monopoly-world-tour
```

systemd 会在进程异常退出后重启；它不会自动探测 HTTP 卡死。`MemoryMax=512M` 为内存上限，并非预留内存。

后续发布先上传新版本，再切换软链接并重启。以下 `<新版本>` 替换为实际目录名，`current.next` 应不存在：

```sh
sudo ln -s /opt/monopoly-world-tour/releases/<新版本> /opt/monopoly-world-tour/current.next
sudo mv -Tf /opt/monopoly-world-tour/current.next /opt/monopoly-world-tour/current
sudo systemctl restart monopoly-world-tour
```

回滚时采用同样步骤将链接指向旧版本。旧目录必须完整保留；切换链接本身不会更新已运行的进程。

若首次迁移失败，需要恢复原 Docker 服务：

```sh
sudo systemctl disable --now monopoly-world-tour
sudo docker update --restart=unless-stopped monopoly-world-tour
sudo docker start monopoly-world-tour
```

恢复 Docker 前必须停止 systemd 服务，避免端口冲突。所有回滚均只能恢复程序版本，不能恢复已清空的内存房间。

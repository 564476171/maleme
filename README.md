# 骂了么

专治恋爱脑上头、暧昧成瘾、ENFP 幻觉综合征的每日清醒服务。

骂了么的毒舌只针对用户自己的脑补模式：容易理想化、沉迷高情绪价值、把暧昧当命运。它不攻击 ENFP、女性或任何人格类型。

## 功能

- 邮箱密码登录，管理员环境变量初始化
- 注册策略：开放注册、邀请码注册、关闭注册
- 用户角色：普通用户、VIP、管理员
- 普通用户配置自己的 OpenAI-compatible `/chat/completions` 模型
- VIP 可选择管理员模型或自己的模型
- 管理后台：用户/VIP、邀请码、管理员模型、每日文案、兄弟人设、记录管理
- 清醒工具箱：兄弟团模式、直接回复模式
- Postgres 持久化，API Key 使用 `APP_SECRET` 加密后入库

## Docker Compose 部署

```sh
git clone https://github.com/564476171/maleme.git
cd maleme
cp .env.example .env
nano .env
docker compose up --build -d
```

在 `.env` 里只需要先填管理员密码：

```env
ADMIN_PASSWORD=你自己设定的管理员密码
```

默认对外端口是 `6088`。数据库连接会由 Compose 自动配置，数据库不暴露到公网；`APP_SECRET` 会在容器内自动生成并保存到 Docker volume。

如果你还想改管理员邮箱或端口，直接改 `.env`：

```env
ADMIN_EMAIL=me@example.com
APP_PORT=6088
```

然后启动：

```sh
docker compose up --build -d
```

也可以继续用懒人脚本：

```sh
./deploy.sh
```

脚本会提示你输入管理员初始密码。

访问：

```text
http://localhost:6088
```

后台：

```text
http://localhost:6088/admin
```

容器启动时会自动执行：

```sh
prisma migrate deploy
node scripts/bootstrap.mjs
```

`bootstrap` 会创建/更新管理员账号，并初始化默认兄弟人设和文案。

常用命令：

```sh
docker compose logs -f app
docker compose ps
docker compose down
```

以后更新代码：

```sh
git pull
docker compose up --build -d
```

## 本地开发

如果不用 Docker，需要本地有 Postgres，并把 `DATABASE_URL` 改成你的本地连接。

```sh
npm install
npx prisma migrate dev
npm run bootstrap
npm run dev
```

常用检查：

```sh
npm run lint
npm run typecheck
npm run build
```

## 模型 URL 规则

前台或后台填写模型 URL 时支持：

- `https://example.com/v1`
- `https://example.com/v1/chat/completions`
- `https://example.com`

应用会统一补全为 `/v1/chat/completions`，并尝试从同一 base 获取 `/v1/models`。如果获取失败，可以手动填写模型名。

## 重置 Docker 数据库

```sh
docker compose down -v
docker compose up --build -d
```

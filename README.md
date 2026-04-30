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
cp .env.example .env
```

编辑 `.env`：

```sh
APP_SECRET=至少32位随机字符串
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=换成强密码
```

启动：

```sh
docker compose up --build
```

访问：

```text
http://localhost:3000
```

后台：

```text
http://localhost:3000/admin
```

容器启动时会自动执行：

```sh
prisma migrate deploy
node scripts/bootstrap.mjs
```

`bootstrap` 会创建/更新管理员账号，并初始化默认兄弟人设和文案。

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
docker compose up --build
```

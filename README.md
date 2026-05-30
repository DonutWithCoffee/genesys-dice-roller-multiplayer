# Genesys Dice Roller Multiplayer Fork

Форк оригинального Genesys Dice Roller с self-hosted multiplayer для одной игровой компании.

Цель проекта — сохранить оригинальный UI/UX дайс-роллера и добавить сетевую игру через общий стол.

## Что умеет форк

- общий игровой стол по одной ссылке;
- синхронизацию публичных бросков между игроками;
- отображение имени игрока, сделавшего бросок;
- историю бросков;
- скрытые броски ведущего;
- историю скрытых бросков видит только ведущий;
- lock роли GM: одновременно только один ведущий;
- защиту локального пула кубов игрока от чужих бросков;
- reroll выбранных кубов без создания новой записи истории;
- подсветку переброшенных кубов у всех игроков;
- отображение полного броска и итогового результата после подсчёта;
- текстовую расшифровку итога проверки;
- подсказку по символам кубов;
- серверный расчёт результатов;
- Node.js backend на Express + Socket.IO;
- запуск на собственном VPS через nginx.

## Чего здесь нет

- аккаунтов;
- OAuth;
- базы пользователей;
- Discord-интеграции;
- VTT-платформы;
- SaaS-функций;
- множества публичных комнат.

## Локальный запуск

Установить зависимости:

```bash
npm install
```

Собрать frontend:

```bash
npm run build
```

Запустить сервер:

```bash
npm run start:server
```

Открыть:

```text
http://localhost:3001/genesys
```

## Деплой на VPS

Пример пути проекта:

```bash
/opt/genesys-dice-roller
```

Обновить код и собрать:

```bash
cd /opt/genesys-dice-roller
git pull --ff-only
npm ci
npm run build
```

Приложение должно слушать локальный порт:

```bash
HOST=127.0.0.1 PORT=3001 node server/index.js
```

Проверка:

```bash
curl http://127.0.0.1:3001/api/health
```

Пример nginx reverse proxy:

```nginx
server {
    listen 80;
    listen [::]:80;

    server_name example.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Проверить nginx:

```bash
nginx -t
systemctl reload nginx
```

Рабочая ссылка после настройки сервера:

```text
http://example.com/genesys
```

## Лицензия

GPL-3.0-or-later.

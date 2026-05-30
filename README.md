# Genesys Dice Roller Multiplayer Fork

Этот форк расширяет оригинальный Genesys Dice Roller и добавляет self-hosted realtime multiplayer.

Цель проекта — сохранить оригинальный UI/UX приложения, но добавить комнаты, синхронизацию бросков и серверную обработку результатов.

Оригинальный проект:

https://github.com/D1SoveR/genesys-dice-roller

UI-референс:

https://d1sover.github.io/genesys-dice-roller/

## Что добавляет форк

* realtime multiplayer rooms;
* URL комнат в формате `/room/:roomId`;
* синхронизацию публичных бросков между игроками;
* отображение имени игрока, сделавшего бросок;
* историю бросков;
* GM mode для мастера;
* скрытые броски мастера, невидимые игрокам;
* историю скрытых бросков, видимую только мастеру;
* server-authoritative rolls — результат считает сервер, а не клиент;
* Node.js backend на Express + Socket.IO;
* self-hosted deployment на VPS через nginx и HTTPS.

## Чего здесь не будет

* аккаунтов;
* OAuth;
* базы пользователей;
* Discord-интеграции;
* VTT-платформы;
* SaaS-функций;
* переписывания frontend с нуля.

## Главный принцип

Frontend остаётся максимально близким к оригинальному Genesys Dice Roller.

Multiplayer добавляется как слой поверх существующего приложения, без смены UX и без замены текущего renderer pipeline.

## Локальный запуск

```bash
npm.cmd run build
npm.cmd run start:server
```

Приложение:

```text
http://localhost:3001/
```

Тестовая комната:

```text
http://localhost:3001/room/test
```

Health check:

```bash
curl http://localhost:3001/api/health
```

## License

GPL-3.0-or-later.

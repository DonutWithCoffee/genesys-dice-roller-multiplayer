# AGENT.md

## Проект

Это multiplayer-форк оригинального [D1SoveR/genesys-dice-roller](https://github.com/D1SoveR/genesys-dice-roller).

Цель проекта — сохранить оригинальный UI/UX Genesys Dice Roller и добавить поверх него self-hosted realtime multiplayer для игры компанией.

Проект не является VTT, SaaS-платформой, Discord-ботом или социальной системой. Это лёгкий онлайн-роллер кубов для Genesys RPG.

## Главная цель

Сделать веб-приложение, в котором:

* игроки подключаются к комнате по ссылке;
* публичные броски видят все участники комнаты;
* результат броска считает сервер;
* скрытые броски GM видит только GM;
* основной интерфейс остаётся максимально близким к оригинальному роллеру.

## Архитектурный принцип

Frontend остаётся UI-слоем.

Backend является источником истины для бросков.

Клиент не должен считаться authoritative-источником результата броска. Клиент отправляет описание пула кубов, сервер выполняет бросок и рассылает результат.

## Текущий стек

Frontend:

* React;
* TypeScript;
* Webpack 4;
* LESS.

Backend:

* Node.js;
* Express;
* Socket.IO.

Deployment target:

* VPS;
* nginx reverse proxy;
* HTTPS;
* Node.js process via pm2/systemd или другой простой process manager.

## Основные фичи

Реализовано:

* комнаты в формате `/room/:roomId`;
* подключение игроков к комнате;
* отображение статуса комнаты;
* отображение списка игроков;
* GM checkbox;
* публичные server-authoritative броски;
* синхронизация публичных бросков между игроками;
* скрытые GM-броски;
* скрытые GM-броски видит только GM;
* история бросков;
* скрытая история GM-бросков видна только GM;
* floating draggable roll history overlay;
* отображение имени игрока, сделавшего бросок;
* локальный fallback вне комнаты;
* health endpoint `/api/health`.

## Что не добавлять

Не добавлять без отдельного решения:

* Discord integration;
* OAuth;
* регистрацию;
* аккаунты;
* базу пользователей;
* полноценную VTT-систему;
* чат;
* voice/video;
* admin panel;
* сложный dashboard;
* тяжёлый редизайн;
* переписывание frontend с нуля.

## UI/UX контракт

Оригинальный интерфейс Genesys Dice Roller является базовым эталоном.

Разрешены только минимальные multiplayer-надстройки:

* room id;
* nickname;
* connection status;
* список игроков;
* GM marker;
* hidden roll action для GM;
* compact roll history overlay.

Запрещено ломать:

* dice controls;
* roll flow;
* result rendering;
* mobile usability;
* общий визуальный ритм оригинального приложения.

## Текущая архитектура

Основные frontend-слои:

* `src/view/main-app-area.tsx` — основной UI/state container;
* `src/network/socket-client.ts` — Socket.IO client wrapper;
* `src/service/roll-service.ts` — локальный fallback rolling;
* `src/model/roll-contracts.ts` — контракт запросов/ответов бросков;
* `src/model/dice-descriptor.ts` — сериализация пула кубов;
* `src/model/dice-result-sync.ts` — применение server-authoritative результатов к локальным dice objects.

Основные backend-слои:

* `server/index.js` — Express + Socket.IO entrypoint;
* `server/room-manager.js` — комнаты, игроки, GM state;
* `server/dice-engine.js` — server-side dice rolling.

## Roll flow

Public multiplayer roll:

1. пользователь собирает пул кубов;
2. frontend создаёт roll request;
3. frontend отправляет request через Socket.IO;
4. сервер валидирует комнату и игрока;
5. сервер бросает кубы;
6. сервер формирует результат;
7. сервер рассылает результат всем участникам комнаты;
8. frontend применяет результат и обновляет UI.

GM hidden roll:

1. GM делает hidden roll;
2. frontend отправляет request с visibility `gm_hidden`;
3. сервер проверяет, что socket принадлежит GM;
4. сервер считает результат;
5. сервер отправляет результат только этому GM socket;
6. игроки не получают ни результат, ни факт броска.

## Текущий рабочий статус

MVP multiplayer уже работает.

Проверено:

* production build проходит;
* server стартует;
* `/api/health` работает;
* `/room/test` открывается;
* public rolls синхронизируются между окнами;
* hidden GM rolls видны только GM;
* roll history не ломает layout;
* floating draggable history работает;
* React key warnings исправлены.

## Рабочие команды

Установка зависимостей:

```bash
npm.cmd install
```

Сборка:

```bash
npm.cmd run build
```

Запуск сервера:

```bash
npm.cmd run start:server
```

Production-like локальная проверка:

```bash
npm.cmd run build
npm.cmd run start:server
```

Health check:

```bash
curl http://localhost:3001/api/health
```

Тестовая комната:

```text
http://localhost:3001/room/test
```

## VPS target

Планируемый VPS:

* domain: `vm141875.donutwithcoffee.serv-dns.ru`;
* IP: `150.251.155.175`.

Целевая схема:

```text
internet
  -> nginx
    -> Node.js app
      -> frontend static files
      -> Socket.IO backend
```

WebSocket через nginx должен поддерживать upgrade headers.

## Roadmap

### Stabilization

* проверить чистоту консоли;
* проверить два окна / два игрока;
* проверить GM handoff;
* проверить reconnect;
* проверить long session behavior.

### Minimal UX polish

* оставить оригинальный UI;
* минимально улучшать только multiplayer overlay;
* не превращать приложение в VTT.

### Deployment

* подготовить production запуск на VPS;
* настроить nginx;
* настроить HTTPS;
* проверить Socket.IO через reverse proxy;
* настроить process manager.

### Release preparation

* актуализировать README;
* зафиксировать known limitations;
* подготовить первый стабильный self-hosted release.

## Стиль разработки

Работать маленькими шагами.

Перед изменением:

1. анализ;
2. решение;
3. точечный код;
4. проверка;
5. commit.

Не делать большие рефакторы без необходимости.

Не переписывать UI.

Не добавлять новые зависимости без явной причины.

Не менять архитектурный контракт без обсуждения.

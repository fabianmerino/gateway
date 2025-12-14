# Industrial Monitoring Gateway - AI Agent Instructions

## Project Overview

This is an Industrial IoT gateway that bridges industrial protocols (OPC UA, Modbus TCP) with MQTT using Sparkplug B specification. It's a monorepo with a Node.js backend gateway service and a React TypeScript admin web interface.

**Architecture:** Multi-service gateway collecting data from industrial devices → publishing to MQTT broker via Sparkplug B protocol → with local SQLite resilience for offline messages.

## Key Components & Data Flow

1. **Entry Point:** [src/index.ts](../src/index.ts) orchestrates all services
   - Loads config from `config.yaml` (validated with Zod schemas in [src/types/config.ts](../src/types/config.ts))
   - Initializes database service (singleton pattern via `databaseService`)
   - Creates SparkplugService instance (manages MQTT/Sparkplug B lifecycle)
   - Dynamically instantiates multiple OpcuaService/ModbusService instances based on config arrays

2. **Service Architecture Pattern:**
   - All protocol services ([src/services/opcua.ts](../src/services/opcua.ts), [src/services/modbus.ts](../src/services/modbus.ts)) follow same pattern:
     - Receive SparkplugService instance in constructor (dependency injection)
     - Auto-register device with Sparkplug using `generateDeviceName()` if `deviceName` not in config
     - Use `ReconnectionManager` utility for exponential backoff reconnection (initial 1s → max 30s)
     - Track monitored variables internally as `Map<string, MonitoredVariable>`
     - Call `sparkplugService.updateMetric(deviceId, name, value, interval)` for each data point

3. **Sparkplug B Device Lifecycle:**
   - Each industrial device = separate Sparkplug device (not edge node metrics)
   - SparkplugService manages device registry in `Map<string, DeviceMetrics>`
   - Waits for all expected tags before sending DBIRTH (`setExpectedTags()` pattern)
   - Publishes on interval-based schedule (respects per-tag `interval` config)
   - Auto-cleanup: devices inactive >5min trigger DDEATH and removal
   - Topics: `spBv1.0/{groupId}/{DBIRTH|DDATA|DDEATH}/{edgeNode}/{deviceId}`

4. **Offline Resilience:**
   - When MQTT disconnected, messages stored to SQLite ([src/services/database.ts](../src/services/database.ts))
   - On reconnect, queued messages published then deleted
   - Database uses WAL mode for better concurrency

5. **Web Admin UI:** [web/](../web/) is separate Vite + React + TypeScript app
   - Protected routes with `<ProtectedRoute>` wrapper checking auth context
   - API client ([web/src/services/api.ts](../web/src/services/api.ts)) handles CSRF tokens from cookies, Bearer auth
   - i18n support (es/en) via react-i18next
   - MSW for testing mocks ([web/src/mocks/](../web/src/mocks/))

## Development Conventions

### Module System & Imports
- **ESM only:** `"type": "module"` in package.json, use `.js` extensions in imports even for `.ts` files
- **Example:** `import { logInfo } from '../utils/logger/index.js'` (note `.js` not `.ts`)

### Code Quality
- **Linter/Formatter:** Biome (not ESLint/Prettier) - config in [biome.json](../biome.json)
  - Single quotes, 2 spaces, 80 char line width, trailing commas (ES5 style)
  - Strict rules: `noUnusedVariables`, `noExplicitAny` are errors
  - Run: `pnpm lint:fix` (root) or `pnpm format` (auto-applies fixes)

### Logging Pattern
- **Always use structured logging:** Import from [src/utils/logger/index.ts](../src/utils/logger/index.ts)
  ```typescript
  import { logInfo, logError, logWarn } from '../utils/logger/index.js';
  const COMPONENT = 'ServiceName'; // Define once per file
  logInfo(COMPONENT, 'Message', { optional: 'data' });
  logError(COMPONENT, 'Error occurred', error);
  ```
- Uses Pino logger under the hood, logs structured JSON in production
- **Never** use `console.log` directly

### Service Naming & Registration
- Device names auto-generated if not in config: `device-{protocol}-{incrementing-number}`
- Pattern in [src/services/sparkplug.ts](../src/services/sparkplug.ts): `generateDeviceName('opcua')` → `device-opcua-1`
- Services call `sparkplugService.registerDevice(this.deviceName)` in constructor

### Type Safety
- Strict TypeScript enabled, NodeNext module resolution
- Zod schemas for runtime config validation (see [src/types/config.ts](../src/types/config.ts))
- No `any` types allowed (Biome enforces)

## Build & Development Workflows

### Monorepo Structure (PNPM workspaces)
- Root: Backend gateway service
- [web/](../web/): Frontend admin UI (separate package.json)
- **Build root:** `pnpm build` → SWC transpiles to `dist/`
- **Build web:** `cd web && pnpm build` → Vite builds to `web/dist/`

### Commands
- **Dev mode:** `pnpm dev` (uses `tsx watch` for hot reload, loads `config.yaml`)
- **Production:** `pnpm start` (runs compiled `dist/index.js`)
- **Type check:** `pnpm type-check` (tsc --noEmit, doesn't build)
- **Web dev:** `cd web && pnpm dev` (Vite dev server)
- **Tests:** `cd web && pnpm test` (Vitest for web UI only, backend has no tests yet)

### Configuration
- **Main config:** `config.yaml` at project root (never commit secrets here)
- Structure: `mqtt` (broker + sparkplug settings), `opcua[]` array, `modbus[]` array
- Each device config has `enabled: boolean`, `deviceName?: string`, `tags[]` array
- Tags have `interval` (ms), `delta` (change threshold for publishing)

### Dependencies
- **Backend:** Fastify, node-opcua, jsmodbus, mqtt, sparkplug-client, better-sqlite3, Pino
- **Tooling:** Biome (not ESLint), SWC (not tsc for build), TSX (dev runner), Vite (web)

## When Adding Features

### New Protocol Support
1. Create service in [src/services/](../src/services/) following OpcuaService/ModbusService pattern
2. Add config type to [src/types/config.ts](../src/types/config.ts) with Zod schema
3. Inject SparkplugService in constructor, call `registerDevice()` + `setExpectedTags()`
4. Use ReconnectionManager for connection resilience
5. Update [src/index.ts](../src/index.ts) to instantiate service(s) from config array
6. Update [config.yaml](../config.yaml) with example configuration


### Database Changes
- Modify schema in [src/services/database.ts](../src/services/database.ts) `init()` method
- Database file: `messages.db` (SQLite, WAL mode)
- Access via singleton `databaseService` (imported from module)

## Common Pitfalls

- **Import extensions:** Always use `.js` in imports, not `.ts` (ESM requirement)
- **Async service startup:** All services in [src/index.ts](../src/index.ts) started via `Promise.all`, failures logged but don't crash process
- **Device birth timing:** DBIRTH only sent after ALL expected tags received (check `setExpectedTags` calls)
- **Sparkplug metric updates:** Call `updateMetric()` even if value unchanged - service handles delta/interval logic internally
- **Web API auth:** API client auto-includes CSRF token from cookie + Bearer token if set
- **Biome vs ESLint:** This project uses Biome, ignore ESLint configs if generating

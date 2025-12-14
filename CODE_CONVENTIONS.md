# Convenciones de Código y Desarrollo

Este documento define los estándares de codificación, herramientas y prácticas de desarrollo para el proyecto Industrial Monitoring Gateway.

## 1. Tecnologías y Herramientas Principales

*   **Lenguaje**: TypeScript (Strict Mode).
*   **Runtime**: Node.js (Backend), React (Frontend).
*   **Gestor de Paquetes**: PNPM (Workspaces).
*   **Linter & Formatter**: [Biome](https://biomejs.dev/) (Reemplaza a ESLint y Prettier).
*   **Compilador/Build**: SWC (Backend), Vite (Frontend).
*   **Ejecución en Desarrollo**: `tsx` (Backend).

## 2. Estándares de Código TypeScript

### 2.1 Sistema de Módulos (ESM)
El proyecto utiliza **ECMAScript Modules (ESM)** nativos (`"type": "module"` en `package.json`).
*   **Regla Crítica**: Todas las importaciones de archivos locales deben incluir la extensión `.js`, incluso si el archivo fuente es `.ts`.
    ```typescript
    // ✅ Correcto
    import { readConfig } from './services/config.js';

    // ❌ Incorrecto
    import { readConfig } from './services/config';
    ```

### 2.2 Tipado Estricto
*   No se permite el uso explícito de `any`. Utilizar `unknown` si el tipo es incierto y realizar validación de tipos (narrowing).
*   Todas las interfaces y tipos deben estar definidos explícitamente, preferiblemente en archivos dedicados en `src/types/`.
*   Validación en tiempo de ejecución: Utilizar **Zod** para validar datos externos (configuración, entradas de API).

### 2.3 Estilo y Formato (Biome)
La configuración de estilo está centralizada en `biome.json`. No se deben anular estas reglas manualmente.
*   **Indentación**: 2 espacios.
*   **Comillas**: Simples (`'`).
*   **Ancho de línea**: 80 caracteres.
*   **Comas finales**: Estilo ES5 (trailing commas).
*   **Variables no usadas**: No permitidas (generan error).

Para verificar y corregir el estilo:
```bash
pnpm lint      # Verificar
pnpm lint:fix  # Corregir automáticamente
pnpm format    # Formatear código
```

## 3. Patrones de Diseño y Arquitectura

### 3.1 Logging Estructurado
*   **Nunca** usar `console.log`, `console.error`, etc.
*   Utilizar el módulo de logger centralizado (`src/utils/logger/index.ts`) que implementa **Pino**.
*   Definir una constante `COMPONENT` al inicio de cada archivo para identificar el origen de los logs.

```typescript
import { logInfo, logError } from '../utils/logger/index.js';
const COMPONENT = 'MyService';

logInfo(COMPONENT, 'Operation started', { metadata: 'value' });
```

### 3.2 Inyección de Dependencias
*   Los servicios deben recibir sus dependencias en el constructor en lugar de instanciarlas internamente (excepto singletons globales como Database).
*   Ejemplo: `ModbusService` recibe `SparkplugService`.

### 3.3 Manejo de Configuración
*   La configuración se carga desde `config.yaml`.
*   Debe ser validada contra esquemas Zod definidos en `src/types/config.ts` antes de iniciar la aplicación.

## 4. Convenciones de Nombres

*   **Archivos y Directorios**: `kebab-case` (ej. `sparkplug-service.ts`, `utils/reconnection.ts`).
*   **Clases**: `PascalCase` (ej. `SparkplugService`, `OpcuaClient`).
*   **Interfaces/Tipos**: `PascalCase` (ej. `MqttConfig`, `StoredMessage`).
*   **Variables y Funciones**: `camelCase` (ej. `startService`, `isConnected`).
*   **Constantes**: `UPPER_SNAKE_CASE` (ej. `DEFAULT_TIMEOUT`, `COMPONENT`).

## 5. Estructura del Proyecto

```
/
├── config.yaml          # Configuración local (no commitear secretos)
├── biome.json           # Configuración de Linter/Formatter
├── src/
│   ├── index.ts         # Punto de entrada
│   ├── services/        # Lógica de negocio (Modbus, OPCUA, MQTT)
│   ├── types/           # Definiciones de tipos e interfaces
│   └── utils/           # Utilidades compartidas (Logger, Reconnection)
└── web/                 # Frontend (React + Vite)
```

## 6. Flujo de Trabajo Git

*   **Ramas**: `main` es la rama principal estable.
*   **Commits**: Usar mensajes descriptivos.
*   **Pull Requests**: Todo cambio debe pasar por PR y pasar los checks de CI (Lint, Type Check, Tests).

## 7. Comandos Útiles

*   `pnpm dev`: Inicia el backend en modo desarrollo (watch).
*   `pnpm build`: Compila el backend a `dist/` usando SWC.
*   `pnpm start`: Ejecuta la versión compilada (producción).
*   `pnpm type-check`: Verifica tipos de TypeScript sin emitir código.

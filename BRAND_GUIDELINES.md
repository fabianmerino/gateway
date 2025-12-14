# Guías de Estilo de Marca (Brand Guidelines)

Este documento define la identidad visual y los principios de diseño para el proyecto **Industrial Gateway**. Estas guías aseguran consistencia, usabilidad y una estética profesional acorde a los estándares de software industrial.

## 1. Identidad de Marca

*   **Nombre del Producto**: Industrial Gateway
*   **Misión**: Proporcionar una interfaz robusta y eficiente para la gestión y monitoreo de conexiones industriales IoT.
*   **Tono de Voz**:
    *   **Técnico y Preciso**: Usar terminología estándar de la industria (MQTT, Modbus, OPC UA). Evitar ambigüedades.
    *   **Eficiente**: Mensajes cortos y directos. La información crítica va primero.
    *   **Confiable**: Transmitir seguridad y estabilidad en cada interacción.

## 2. Identidad Visual

### 2.1 Temas (Dark & Light)
La aplicación soporta ambos modos, priorizando el **Modo Oscuro** por defecto para entornos industriales (salas de control), pero ofreciendo un **Modo Claro** de alto contraste para entornos de oficina o exteriores.

### 2.2 Paleta de Colores

#### Colores Primarios (Marca)
Comunes para ambos modos, ajustando ligeramente la luminosidad si es necesario.
*   **Industrial Blue**: `#0ea5e9` (Sky 500) - Acción principal, enlaces, foco.
*   **Deep Blue**: `#0284c7` (Sky 600) - Hover, estados activos.

#### Modo Oscuro (Dark Mode - Default)
Jerarquía de profundidad basada en tonos Slate oscuros.
*   **Background Main**: `#0f172a` (Slate 900) - Fondo general.
*   **Surface Card**: `#1e293b` (Slate 800) - Tarjetas, paneles.
*   **Surface Hover**: `#334155` (Slate 700) - Interactivos.
*   **Border**: `#1e293b` (Slate 800) - Divisores.
*   **Text Primary**: `#f8fafc` (Slate 50) - Títulos.
*   **Text Secondary**: `#94a3b8` (Slate 400) - Metadatos.

#### Modo Claro (Light Mode)
Jerarquía limpia y de alto contraste basada en tonos Slate claros y blancos.
*   **Background Main**: `#f8fafc` (Slate 50) - Fondo general (no blanco puro para reducir fatiga).
*   **Surface Card**: `#ffffff` (White) - Tarjetas con sombra sutil (`shadow-sm`).
*   **Surface Hover**: `#f1f5f9` (Slate 100) - Interactivos.
*   **Border**: `#e2e8f0` (Slate 200) - Divisores.
*   **Text Primary**: `#0f172a` (Slate 900) - Títulos.
*   **Text Secondary**: `#64748b` (Slate 500) - Metadatos.

#### Colores de Estado (Semánticos)
Cruciales para la visualización de datos y alertas.
*   **Success (Online/OK)**: `#22c55e` (Green 500) - Conectado, estable.
*   **Warning (Alert)**: `#f59e0b` (Amber 500) - Latencia alta, advertencia.
*   **Error (Offline/Fail)**: `#ef4444` (Red 500) - Desconectado, error crítico.
*   **Info (Neutral)**: `#3b82f6` (Blue 500) - Información general.

### 2.3 Tipografía

*   **Familia Tipográfica**: `Inter` (Google Fonts) o `system-ui`.
    *   Elegida por su excelente legibilidad en interfaces de usuario y soporte de números tabulares (importante para tablas de datos).
*   **Pesos**:
    *   `Regular (400)`: Cuerpo de texto.
    *   `Medium (500)`: Etiquetas, botones, encabezados de tabla.
    *   `SemiBold (600)`: Títulos de sección, KPIs destacados.
    *   `Bold (700)`: Títulos principales (poco uso).

## 3. Principios de UI/UX

### 3.1 Densidad de Información
*   **Alta Densidad**: Como herramienta profesional, se prioriza mostrar más información relevante en pantalla sin saturar.
*   **Espaciado Compacto**: Utilizar paddings y margins ajustados (ej. `px-3 py-2` para celdas de tabla).

### 3.2 Visualización de Datos
*   **Tablas**: Deben ser claras, con filas alternas (zebra striping) opcionales o bordes sutiles. Números alineados a la derecha. Fuente monoespaciada para valores numéricos cambiantes.
*   **Gráficos**: Minimalistas. Sin gradientes excesivos ni sombras pesadas. Líneas finas y puntos de datos claros.
*   **KPIs**: Tarjetas simples con el valor grande y claro, y un indicador de tendencia (flecha arriba/abajo) si aplica.

### 3.3 Navegación
*   **Sidebar Lateral**: Colapsable para maximizar el área de trabajo.
*   **Iconografía**: Usar `Lucide React` o `Phosphor Icons`. Estilo de línea (outline) consistente. Tamaño estándar 16px o 20px.

### 3.4 Feedback del Sistema
*   **Toasts**: Notificaciones flotantes no intrusivas para confirmaciones de acciones (ej. "Configuración guardada").
*   **Indicadores de Carga**: Skeletons para la carga inicial de datos, spinners pequeños para acciones de botones.

## 4. Componentes Clave (Basado en Shadcn UI)

*   **Botones**:
    *   *Primary*: Fondo azul, texto blanco.
    *   *Secondary/Outline*: Borde gris, texto claro.
    *   *Destructive*: Fondo rojo o texto rojo (para eliminar/detener).
*   **Inputs**: Fondo oscuro (`Slate 950`), borde sutil (`Slate 800`), focus ring azul.
*   **Badges/Etiquetas**: Usados para estados (Online/Offline). Fondo semitransparente con borde del color del estado.

## 5. Logotipo (Placeholder)

Por el momento, el logotipo se representará mediante:
*   **Icono**: Un símbolo de "Network" o "Gateway" (ej. cubo conectado o nodos).
*   **Texto**: "Industrial Gateway" en peso `SemiBold`.

---
*Este documento debe ser la referencia para cualquier decisión de diseño en el frontend.*

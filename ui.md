### CONFIGURACIÓN DE ESTILO DE INTERFAZ (Estilo Fable / Clean Premium)

- **Paleta de Colores (Modo Oscuro Predeterminado):**
  - Fondo Principal: `#0B0B0C` (Casi negro absoluto)
  - Superficies (Cards/Modales): `#121214`
  - Bordes / Separadores: `#1F1F23` (Ultra finos: 1px)
  - Color de Acento (Primario): `#7C3AED` (Violeta vibrante) o `#00F5A0` (Verde Neón para loaders/activos)
  - Texto Principal: `#F4F4F5`
  - Texto Secundario/Muted: `#A1A1AA`

- **Tipografía:**
  - Inter o Geist Sans para cuerpo y controles de UI (Tracking ajustado en -0.02em para verse premium).
  - JetBrains Mono o Geist Mono para SKU, IDs, Precios y Dólar.

- **Micro-interacciones y Efectos (Simil CSS Effects):**
  - **Botones Primarios:** Fondo violeta con un sutil gradiente interno, `transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`. Al hacer hover, un brillo interno perimetral muy fino o un leve escalado (`scale: 1.02`).
  - **Inputs:** Fondo `#161619`, borde `#1F1F23`. Al hacer focus, el borde cambia a color de acento con un `box-shadow` difuminado de no más de 4px (`rgba(124, 58, 237, 0.15)`).
  - **Loaders (como la imagen de referencia):** Usar animaciones fluidas con SVG, por ejemplo, el efecto "Orbit" u "Equalizer" para cargas de datos pesadas en los dashboards.
  - **Efecto de Glassmorphism:** Para modales superiores, usar `backdrop-filter: blur(12px) bg-opacity-70`.
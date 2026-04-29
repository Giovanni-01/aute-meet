# Aute Meet — Design System
## Extraído del Figma "NUEVA WEB AUTE" + referencia Cal.com

---

## 1. Paleta de color

### Primaria (identidad Aute)
| Nombre         | Hex       | Uso                                    |
|----------------|-----------|----------------------------------------|
| Aute Original  | `#64797C` | Color principal de marca, headers, nav |
| Aute Medium    | `#8A9F9F` | Backgrounds secundarios, hover states  |
| Aute Light     | `#C2CDCF` | Bordes, fondos suaves, disabled        |
| Aute Orange    | `#F0BF47` | CTAs secundarios, acentos cálidos      |
| Light Orange   | `#F7B682` | Hover de acentos, badges               |

### Secundaria (apoyo)
| Nombre         | Hex       | Uso                                    |
|----------------|-----------|----------------------------------------|
| Aute Dark      | `#37585A` | Texto sobre fondos claros, énfasis     |
| Black          | `#000000` | Texto principal                        |
| White          | `#FFFFFF` | Fondos principales                     |
| JuntosxAute    | `#223382` | Acentos fríos, links, estados activos  |
| Aute Neutral   | `#F5F5F5` | Fondo de página, cards                 |

### Derivados para UI (propuesta para Aute Meet)
| Token               | Hex       | Origen                              |
|----------------------|-----------|--------------------------------------|
| --brand-primary      | `#64797C` | Aute Original                       |
| --brand-dark         | `#37585A` | Aute Dark                           |
| --brand-accent       | `#F0BF47` | Aute Orange (CTA principal)         |
| --brand-accent-hover | `#E8A830` | Aute Orange oscurecido              |
| --bg-page            | `#F7F8F8` | Aute Neutral ligeramente cálido     |
| --bg-card            | `#FFFFFF` | White                               |
| --border-subtle      | `#C2CDCF` | Aute Light                          |
| --text-primary       | `#1A1A1A` | Near-black                          |
| --text-secondary     | `#64797C` | Aute Original (como texto muted)    |
| --text-muted         | `#8A9F9F` | Aute Medium                         |
| --success            | `#16A34A` | Green (mantener del sistema actual) |
| --error              | `#DC2626` | Red (mantener del sistema actual)   |

---

## 2. Tipografía

### Fuente principal: Sofia Pro
- **Familia**: `'Sofia Pro', 'Sofia Sans', system-ui, sans-serif`
- Sofia Pro es una fuente comercial. Alternativa gratuita similar: **Sofia Sans** (Google Fonts) o **Nunito Sans** como fallback.
- Si se usa Sofia Pro, necesita licencia web o servicio como Adobe Fonts.

### Escala tipográfica (del Figma)
| Nivel      | Peso      | Tamaño | Line-height | Uso                    |
|------------|-----------|--------|-------------|------------------------|
| Heading XL | SemiBold 600 | 70px   | -           | Hero sections          |
| Heading L  | SemiBold 600 | 50px   | -           | Títulos de sección     |
| Heading M  | SemiBold 600 | 40px   | -           | Subtítulos             |
| Heading S  | SemiBold 600 | 25px   | -           | Títulos de card        |
| Subtitle   | SemiBold, caps 600 | 13px   | -           | Labels, categorías     |
| Body       | Regular 400 | 17px   | 1.6em       | Texto de párrafo       |
| Body Small | Light 200  | 13px   | 1.2em       | Captions, metadata     |

### Para Aute Meet (escala adaptada a app, no web corporativa)
| Nivel      | Peso | Tamaño | Tracking  | Uso                         |
|------------|------|--------|-----------|-----------------------------|
| Page title | 600  | 24px   | -0.02em   | Títulos de página           |
| Section    | 600  | 18px   | -0.01em   | Secciones del dashboard     |
| Card title | 500  | 15px   | 0         | Nombres de event types      |
| Body       | 400  | 14px   | 0         | Texto general               |
| Small      | 400  | 13px   | 0         | Metadata, timestamps        |
| Tiny       | 400  | 11px   | 0.02em    | Badges, labels              |

---

## 3. Logo

- **Logo principal**: Wordmark handwritten "AUTE" en color `#64797C` (Aute Original)
- **Estilo**: Orgánico, manuscrito, con la T formando una cruz sutil
- El logo existe como PNG en el Figma. Para Aute Meet usar "Aute Meet" en texto con la misma fuente Sofia Pro SemiBold, no el wordmark handwritten.
- El icono de la app puede ser el logotipo AUTE simplificado sobre fondo `#64797C`

---

## 4. Estilo de componentes (fusión Cal.com + Aute)

### Principio general
Cal.com define la estructura y patrones UX. Aute aporta color, tipografía e identidad visual. La app debe sentirse como Cal.com en usabilidad pero con la personalidad cromática y tipográfica de Aute.

### Cards
- Border radius: `16px` (rounded-2xl) — mantener del diseño actual
- Border: `1px solid var(--border-subtle)` (#C2CDCF)
- Shadow: `0 1px 3px rgba(55, 88, 90, 0.06)` (sombra con tinte Aute Dark)
- Padding: `20px` (px-5 py-4)
- Background: white

### Botones
| Variante   | Background          | Text      | Border                | Hover                    |
|------------|--------------------|-----------|-----------------------|--------------------------|
| Primary    | `#64797C`          | `#FFFFFF` | none                  | `#37585A`                |
| Accent     | `#F0BF47`          | `#1A1A1A` | none                  | `#E8A830`                |
| Secondary  | `transparent`      | `#64797C` | `1px solid #C2CDCF`  | `bg #F7F8F8`             |
| Ghost      | `transparent`      | `#8A9F9F` | none                  | `text #37585A`           |
| Destructive| `#DC2626`          | `#FFFFFF` | none                  | `#B91C1C`                |

- Border radius botones: `10px` (rounded-lg)
- Altura: 36px (sm), 40px (default), 44px (lg)
- Font weight: 500

### Inputs / Form fields
- Border: `1px solid #C2CDCF`
- Border radius: `10px`
- Focus: `border-color: #64797C; ring: 1px #64797C`
- Placeholder: `#8A9F9F`
- Padding: `8px 12px`

### Navegación
- Background: white
- Border bottom: `1px solid #C2CDCF`
- Logo: "Aute Meet" en Sofia Pro SemiBold `#37585A`
- Nav links: `#64797C`, hover `#37585A`

### Calendario (booking widget)
- Día disponible: `#64797C` text, hover `bg #64797C text white`
- Día seleccionado: `bg #64797C text white`
- Día no disponible: `#C2CDCF`
- Hoy: border `2px solid #F0BF47`
- Slot buttons: `border #C2CDCF`, hover `bg #64797C text white`
- Slot seleccionado: `bg #64797C text white`

### Status badges
- Activo: `bg #64797C/10 text #37585A`
- Inactivo: `bg #F5F5F5 text #8A9F9F`
- Confirmado: `bg #16A34A/10 text #16A34A`
- Cancelado: `bg #DC2626/10 text #DC2626`

---

## 5. Espaciado y layout

- Max width contenido: `1024px` (max-w-5xl) en dashboard, `640px` (max-w-3xl) en formularios
- Padding horizontal página: `24px` (px-6)
- Gap entre secciones: `32px` (mt-8)
- Gap entre cards: `12px` (space-y-3)
- Gap interno cards: `16px` (gap-4)

---

## 6. Combinaciones de color por proyecto (del Figma)

El Figma define "combinaciones por proyecto" con distribución de colores. Para Aute Meet la combinación relevante es la corporativa general:
- Dominante: Aute Original `#64797C` (~40%)
- Apoyo: White/Neutral `#FFFFFF` / `#F5F5F5` (~35%)
- Acento: Aute Orange `#F0BF47` (~15%)
- Contraste: Aute Dark `#37585A` (~10%)

---

## 7. Implementación en Tailwind

```css
/* globals.css — custom properties */
:root {
  --brand-primary: #64797C;
  --brand-dark: #37585A;
  --brand-accent: #F0BF47;
  --brand-accent-hover: #E8A830;
  --bg-page: #F7F8F8;
  --bg-card: #FFFFFF;
  --border-subtle: #C2CDCF;
  --text-primary: #1A1A1A;
  --text-secondary: #64797C;
  --text-muted: #8A9F9F;
}
```

```js
// tailwind.config — extend theme
module.exports = {
  theme: {
    extend: {
      colors: {
        aute: {
          DEFAULT: '#64797C',
          dark: '#37585A',
          medium: '#8A9F9F',
          light: '#C2CDCF',
          orange: '#F0BF47',
          'orange-light': '#F7B682',
          navy: '#223382',
          neutral: '#F5F5F5',
        }
      },
      fontFamily: {
        sans: ['"Sofia Pro"', '"Sofia Sans"', 'system-ui', 'sans-serif'],
      }
    }
  }
}
```

---

## 8. Notas para Sprint 5

- Reemplazar todos los `slate-*` del sistema actual por los tokens Aute
- El botón "Conectar Google Calendar" pasa de `bg-slate-900` a `bg-aute` (o `bg-aute-dark`)
- CTAs principales de booking (confirmar reunión) usan `bg-aute-orange` para destacar
- El logo "Aute Meet" en el nav usa Sofia Pro SemiBold, no el wordmark handwritten
- Considerar si se quiere incluir el wordmark AUTE handwritten como icono/favicon
- La página pública de booking es donde más importa la identidad visual (es lo que ven externos)

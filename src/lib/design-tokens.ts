// Constantes de marca para usos JS puros (fuera de className) — ver
// mara-dental-design-spec.md sección 1.1.
//
// El azul de Telegram vive como CSS var (--telegram-blue / --telegram-blue-hover
// en globals.css) porque Tailwind resuelve clases arbitrarias de forma estática:
// una interpolación JS como `text-[${TELEGRAM_BLUE}]` nunca sería detectada por
// el compilador. En JSX se usa `text-[color:var(--telegram-blue)]`; estas
// constantes son para el puñado de casos que necesitan el hex plano (style={}}).
export const TELEGRAM_BLUE = "#2AABEE";
export const TELEGRAM_BLUE_HOVER = "#229ED9";

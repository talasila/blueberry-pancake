import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

/**
 * Sonner applies its own CSS using internal custom properties (--normal-bg,
 * --normal-text, --normal-border) with enough specificity to override the
 * Tailwind classNames shadcn ships by default. We remap those internal vars
 * to our theme-aware CSS custom properties so toasts respect the event theme.
 *
 * --event-surface / --event-surface-fg are set by EventThemeProvider on
 * document.documentElement when an event theme is active; the fallbacks
 * ensure plain pages still look correct.
 */
const toasterStyle: React.CSSProperties & Record<string, string> = {
  "--normal-bg": "var(--event-surface, var(--background))",
  "--normal-text": "var(--event-surface-fg, var(--foreground))",
  "--normal-border": "var(--border)",
}

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      richColors
      className="toaster group"
      style={toasterStyle}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }

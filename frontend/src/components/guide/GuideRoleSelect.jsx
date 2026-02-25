import { Wine, PartyPopper } from 'lucide-react';

/**
 * Role selection screen — first view when the guide opens.
 * Two large, full-width buttons: "I'm Hosting" and "I'm a Guest".
 *
 * @param {object} props
 * @param {function} props.onSelectRole - Called with 'host' or 'guest'
 */
export default function GuideRoleSelect({ onSelectRole }) {
  return (
    <div className="flex flex-col gap-4 p-6">
      <p className="text-center text-sm text-muted-foreground">
        Which role fits you best?
      </p>

      <button
        onClick={() => onSelectRole('host')}
        className="flex min-h-[80px] w-full items-center gap-4 rounded-lg border-2 border-primary/20 bg-primary/5 px-5 py-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/10 active:bg-primary/15"
      >
        <Wine className="h-8 w-8 shrink-0 text-primary" />
        <div>
          <span className="block text-base font-semibold">I'm Hosting</span>
          <span className="block text-sm text-muted-foreground">
            Learn how to set up a tasting party
          </span>
        </div>
      </button>

      <button
        onClick={() => onSelectRole('guest')}
        className="flex min-h-[80px] w-full items-center gap-4 rounded-lg border-2 border-primary/20 bg-primary/5 px-5 py-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/10 active:bg-primary/15"
      >
        <PartyPopper className="h-8 w-8 shrink-0 text-primary" />
        <div>
          <span className="block text-base font-semibold">I'm a Guest</span>
          <span className="block text-sm text-muted-foreground">
            Find out what to expect and how to join
          </span>
        </div>
      </button>
    </div>
  );
}

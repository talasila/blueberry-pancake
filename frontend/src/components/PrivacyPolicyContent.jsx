/**
 * PrivacyPolicyContent Component
 *
 * Shared privacy policy text used by both the standalone /privacy page
 * and the bottom sheet on form pages.
 */
export default function PrivacyPolicyContent() {
  return (
    <div className="space-y-6 text-sm">
      <p>
        blindwinetasting.party is a blind tasting event management app. This policy explains how we handle your data.
      </p>

      <section>
        <h3 className="font-semibold mb-2">What we collect</h3>
        <p className="mb-2">
          The only personal information we collect is your <strong>email address</strong>, provided when you join an event or sign in as a host. We use it to:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>Identify you across sessions within the same event</li>
          <li>Determine whether you are a guest or an event host</li>
          <li>Send one-time password codes to hosts for login</li>
        </ul>
        <p className="mt-2 text-muted-foreground">
          Your email is never shown to other guests. Event hosts can see guest email addresses for event management purposes.
        </p>
      </section>

      <section>
        <h3 className="font-semibold mb-2">Third-party services</h3>
        <p className="text-muted-foreground">
          Host login codes are delivered via <strong>Resend</strong>, a transactional email service. Your email address is shared with Resend solely for this purpose. See{' '}
          <a
            href="https://resend.com/legal/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            Resend's privacy policy
          </a>.
        </p>
        <p className="mt-2 text-muted-foreground">
          No analytics, advertising, or tracking services are used.
        </p>
      </section>

      <section>
        <h3 className="font-semibold mb-2">Cookies</h3>
        <p className="text-muted-foreground">
          The app may set cookies for session management. These are strictly functional — no tracking or advertising cookies are used. The app works with cookies disabled.
        </p>
      </section>

      <section>
        <h3 className="font-semibold mb-2">Data retention</h3>
        <p className="text-muted-foreground">
          Event data, including your email and any ratings you submit, persists for the lifetime of the event. When an event host deletes an event, all associated data is permanently removed.
        </p>
      </section>

      <section>
        <h3 className="font-semibold mb-2">Your rights</h3>
        <ul className="space-y-2 text-muted-foreground">
          <li>
            <strong>Guests:</strong> You may request that the event host remove your personal information and associated data from the event.
          </li>
          <li>
            <strong>Hosts:</strong> You may delete any event you have created. Upon deletion of your last remaining event, all records associated with your account are permanently removed from the system.
          </li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold mb-2">Contact</h3>
        <p className="text-muted-foreground">
          For questions about this policy, reach us at{' '}
          <a href="mailto:privacy@blindwinetasting.party" className="underline hover:text-foreground">
            privacy@blindwinetasting.party
          </a>.
        </p>
      </section>
    </div>
  );
}

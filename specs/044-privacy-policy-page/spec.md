# Feature Specification: Privacy Policy Page

**Feature Branch**: `044-privacy-policy-page`
**Created**: 2026-03-24
**Status**: Draft
**Input**: User description: "Add a /privacy route displaying the app's privacy policy, with links from the email entry and host authentication pages."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Privacy Policy (Priority: P1)

As a user (guest or host), I want to view a privacy policy page that explains how my data is handled, so that I understand what personal information is collected, how it is used, and what rights I have.

**Why this priority**: This is the core deliverable — without a viewable privacy policy, the feature has no value. It also satisfies the primary legal obligation of disclosing data handling practices.

**Independent Test**: Can be fully tested by navigating to `/privacy` and verifying the complete policy text renders correctly. Delivers standalone value as the privacy disclosure itself.

**Acceptance Scenarios**:

1. **Given** a user on any page, **When** they navigate to `/privacy`, **Then** they see the full privacy policy text with all sections (What we collect, Third-party services, Cookies, Data retention, Your rights, Contact).
2. **Given** a user viewing the privacy policy, **When** they click the Resend privacy policy link, **Then** it opens in a new browser tab.
3. **Given** a user who is not authenticated, **When** they navigate to `/privacy`, **Then** they can view the privacy policy without being redirected to a login page.

---

### User Story 2 - Discover Privacy Policy from Guest Email Entry (Priority: P2)

As a guest about to join an event, I want to see a link to the privacy policy on the email entry page, so that I can review how my email will be used before providing it.

**Why this priority**: The email entry page is the primary point where guest PII is collected. Presenting the privacy link here gives users the opportunity to make an informed decision before submitting their email.

**Independent Test**: Can be fully tested by navigating to an event's email entry page and verifying a privacy policy link is visible and functional. Delivers value by disclosing data practices at the point of data collection.

**Acceptance Scenarios**:

1. **Given** a guest on the email entry page, **When** the page loads, **Then** a privacy policy link is visible below the form (e.g., "By continuing, you agree to our Privacy Policy").
2. **Given** a guest on the email entry page, **When** they click the privacy policy link, **Then** they are navigated to the `/privacy` page.
3. **Given** a guest who navigated to the privacy policy from the email entry page, **When** they use the browser back button, **Then** they return to the email entry page with their previously entered data preserved.

---

### User Story 3 - Discover Privacy Policy from Host Login (Priority: P3)

As a host about to sign in, I want to see a link to the privacy policy on the authentication page, so that I can review how my email will be used before providing it.

**Why this priority**: The host authentication page is the secondary point where PII is collected. Same principle as the guest flow, but lower priority since hosts are typically repeat users who have already seen the policy.

**Independent Test**: Can be fully tested by navigating to the host authentication page and verifying a privacy policy link is visible and functional.

**Acceptance Scenarios**:

1. **Given** a host on the authentication page, **When** the page loads, **Then** a privacy policy link is visible below the form.
2. **Given** a host on the authentication page, **When** they click the privacy policy link, **Then** they are navigated to the `/privacy` page.

---

### Edge Cases

- What happens when a user navigates directly to `/privacy` without coming from any form page? The page renders normally as a standalone page.
- What happens on narrow mobile screens? The policy text reflows to remain readable without horizontal scrolling.
- What happens if the contact email placeholder has not been replaced before deployment? The page should display a valid contact email — this is a deployment prerequisite, not a runtime concern.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a publicly accessible page at the `/privacy` route that displays the full privacy policy text.
- **FR-002**: The privacy policy page MUST NOT require authentication to view.
- **FR-003**: The privacy policy page MUST display the following sections: What we collect, Third-party services, Cookies, Data retention, Your rights, and Contact.
- **FR-004**: The privacy policy page MUST include a "Last updated" date.
- **FR-005**: The email entry page (guest registration) MUST display a link to the privacy policy below the form.
- **FR-006**: The host authentication page MUST display a link to the privacy policy below the form.
- **FR-007**: The privacy policy link on the email entry and authentication pages MUST be informational only — it MUST NOT block form submission or require a consent checkbox.
- **FR-008**: External links within the privacy policy (e.g., Resend's privacy policy) MUST open in a new browser tab.
- **FR-009**: The privacy policy page MUST be styled consistently with the rest of the application (same layout patterns, typography, and responsive behavior).

### Privacy Policy Content

The privacy policy MUST contain the following agreed-upon text:

> **Privacy Policy**
>
> *Last updated: [date]*
>
> blindwinetasting.party is a blind tasting event management app. This policy explains how we handle your data.
>
> **What we collect**
>
> The only personal information we collect is your **email address**, provided when you join an event or sign in as a host. We use it to:
> - Identify you across sessions within the same event
> - Determine whether you are a guest or an event host
> - Send one-time password codes to hosts for login
>
> Your email is never shown to other guests. Event hosts can see guest email addresses for event management purposes.
>
> **Third-party services**
>
> Host login codes are delivered via **Resend**, a transactional email service. Your email address is shared with Resend solely for this purpose. See Resend's privacy policy.
>
> No analytics, advertising, or tracking services are used.
>
> **Cookies**
>
> The app may set cookies for session management. These are strictly functional — no tracking or advertising cookies are used. The app works with cookies disabled.
>
> **Data retention**
>
> Event data, including your email and any ratings you submit, persists for the lifetime of the event. When an event host deletes an event, all associated data is permanently removed.
>
> **Your rights**
>
> - **Guests:** You may request that the event host remove your personal information and associated data from the event.
> - **Hosts:** You may delete any event you have created. Upon deletion of your last remaining event, all records associated with your account are permanently removed from the system.
>
> **Contact**
>
> For questions about this policy, reach us at [contact email].

## Assumptions

- The contact email address will be provided before implementation begins. If not finalized, a placeholder configuration value will be used that can be updated at deployment time.
- The "Last updated" date will reflect the deployment date and can be managed as a configuration value or hardcoded during implementation.
- No backend changes are required — this is a frontend-only feature with static content.
- No cookie consent banner is needed since all cookies are strictly functional.
- The privacy policy link text on the email entry and auth pages is: "By continuing, you agree to our Privacy Policy" with "Privacy Policy" as the clickable link.

## Out of Scope

- Cookie consent banner
- GDPR data export endpoint
- Terms of service page
- Backend API changes
- User consent tracking or audit logging
- Internationalization / translation of policy text

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of users can access and read the privacy policy from any state (authenticated or not) within one navigation action.
- **SC-002**: Privacy policy link is visible on both data collection pages (email entry and host authentication) without scrolling past the form.
- **SC-003**: Privacy policy page is fully readable on all supported screen sizes (mobile, tablet, desktop) without horizontal scrolling.
- **SC-004**: All external links in the privacy policy open in a new tab and do not navigate the user away from the application.

# Research: Unified Invite Drawer

**Branch**: `032-invite-drawer` | **Date**: 2026-03-13

## R1: QR Code Library Selection

**Decision**: Use `qrcode.react` v4.2.0

**Rationale**:
- 3.4M weekly downloads, actively maintained (last push Sep 2025), 4.2K GitHub stars
- ~5KB gzipped — minimal bundle impact
- Exports both `QRCodeSVG` (for display) and `QRCodeCanvas` (for PNG export)
- Simple prop-based API: `value`, `size`, `level`, `bgColor`, `fgColor`, `marginSize`
- React 19 compatible
- No server-side dependencies

**Alternatives considered**:
- `react-qr-code`: Similar feature set but fewer downloads and less active maintenance
- `qrcode` (non-React): Lower-level canvas library — would require manual React integration
- Custom implementation: Violates constitution principle II (use battle-tested packages)

**Usage plan**:
- `QRCodeSVG` for the in-drawer display (crisp at any size, theme-friendly)
- `QRCodeCanvas` rendered offscreen for PNG export (canvas required for `toBlob()`)

## R2: PNG Download Strategy

**Decision**: Offscreen canvas rendering with `canvas.toBlob()` → `URL.createObjectURL()` → programmatic `<a>` download

**Rationale**:
- `QRCodeCanvas` renders to a `<canvas>` element — we can get its image data
- For the downloadable PNG, we create a larger canvas that composites: QR code + event name text + PIN text
- `canvas.toBlob()` is supported in all modern browsers (Can I Use: 97%+)
- Programmatic download via hidden `<a>` tag with `download` attribute is the standard pattern

**Alternatives considered**:
- `html2canvas` to screenshot the QR card: Heavy dependency (~40KB), unreliable with CSS
- SVG-to-PNG conversion: Complex, cross-browser issues with `foreignObject`
- Server-side PNG generation: Violates the "no backend changes" constraint

**Implementation sketch**:
1. Create an offscreen `<canvas>` (e.g., 400×500px)
2. Draw white background
3. Render `QRCodeCanvas` ref and copy its image data via `drawImage()`
4. Draw event name and PIN as text below the QR using `fillText()`
5. `canvas.toBlob('image/png')` → create object URL → trigger download
6. Clean up object URL after download

## R3: Native Share API Feature Detection

**Decision**: Use `navigator.canShare?.()` to conditionally render the Share button

**Rationale**:
- `navigator.share()` is supported on mobile Safari (iOS 12.2+), Chrome Android, and some desktop browsers
- `navigator.canShare()` returns a boolean — safer than try/catch on `navigator.share()`
- When unavailable, the Share button is simply not rendered; "Copy Invitation" spans full width
- Share cancellation by the user throws an `AbortError` — this must be caught and silently ignored (not shown as an error)

**Implementation**:
```javascript
const canShare = typeof navigator !== 'undefined' && navigator.canShare?.({ text: 'test' });
```

## R4: Formatted Invitation Message

**Decision**: Fixed template, not customizable

**Template**:
```
You're invited to "{EVENT_NAME}"!
Join here: {EVENT_URL}
PIN: {PIN}
```

**Rationale**:
- Simple, complete, works in all messaging contexts (SMS, WhatsApp, email, etc.)
- Includes all three pieces of information a guest needs: event name (context), URL (action), PIN (access)
- Same message used for both clipboard copy and native share
- No customization needed — hosts are not creating marketing material, they're sharing access

## R5: Existing Code to Remove

**Decision**: Clean removal of all Share/PIN-related code that the Invite drawer replaces

**Items to remove**:
- `handleCopyEventLink` function
- `linkCopied` / `setLinkCopied` state
- `copied` / `setCopied` state (PIN copy in old drawer)
- Floating Share button JSX (next to event name)
- PIN `SettingsRow` and its `SideDrawer`
- `KeyRound` icon import (no longer used)
- `Share2` icon import (no longer used — Invite row uses `UserPlus`)

**Items to preserve**:
- `isRegenerating` / `setIsRegenerating` state
- `regenerateError` / `regenerateSuccess` state and handlers
- `apiClient.regeneratePIN()` call and event state update logic
- All these move into the new Invite drawer context

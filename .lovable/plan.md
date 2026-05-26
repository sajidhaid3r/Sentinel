# SENTINEL — Phased Implementation Plan

Your request bundles a critical security fix with ~15 substantial feature changes. Shipping it all in one turn would take hours and likely produce regressions. I'll split into 4 phases. **Approve to start Phase 1**, or reorder/drop phases.

---

## Phase 1 — Critical Security + Auth Hardening (ship first)

1. **Fix role escalation vulnerability (`user_roles_self_insert`)**
   - Remove the open INSERT policy on `user_roles`.
   - On signup, every user is auto-assigned `citizen` via a SECURITY DEFINER trigger.
   - Role upgrades to `admin` / `government` require an existing admin (admin-only policy + invite code flow for first admin via seed).
2. **Real email verification (OTP)**
   - Disable auto-confirm. Use Supabase's built-in email OTP (`signInWithOtp` / `verifyOtp`) on signup. User cannot reach the app until OTP is verified.
3. **Role-gated tab access** enforced both in UI and via RLS (already partially done — audited and tightened).

---

## Phase 2 — Profile, Theme, QR Scan, Onboarding by Role

4. **Profile button (top-left)** with dropdown: Profile / Dashboard / Settings.
   - Profile page: edit personal + medical info, view/download QR, "Last updated", "Share passport" link.
   - Settings page: account, notifications, language.
5. **Light/Dark theme toggle** beside profile button. Audit all semantic tokens so nothing breaks in either mode.
6. **QR scan/view page** (`/passport/:token`): authorized users (medics/admin/gov) can open a passport from a scanned QR — opens inside SENTINEL chrome showing the health profile read-only.
7. **Role-specific onboarding**: admins fill facility name / license / jurisdiction; government fills department / region / clearance. Citizens keep current medical intake.
8. **Move top tabs to a left sidebar** (sticky vertical nav).

---

## Phase 3 — Maps & Offline (Google Maps Platform connector)

9. **Geospatial Map upgrade**: switch from Leaflet/Overpass to **Google Maps + Places API (New)** via the Lovable connector for real, legitimate data with names, addresses, phone numbers, hours.
   - Blue neon dot at user location (after permission grant).
   - 5 km radius search: hospitals (red), clinics (cyan), pharmacies (purple) — all neon.
   - Hover/click shows name, type, address, phone.
   - Text search any place worldwide → re-centers and re-queries.
   - Filters: radius, category, open-now.
10. **Offline Mode**: gated on location permission. Map only renders after grant. 7 km radius. Auto-syncs on `online` event, stores last-fetched data + timestamp in IndexedDB, viewable offline.

> Requires connecting the **Google Maps Platform** connector. I'll prompt you when we reach this phase.

---

## Phase 4 — Intelligence Modules + AI Doctor

11. **AI Chat Doctor** (Lovable AI, `google/gemini-3-flash-preview`) — system-prompted with knowledge of historical pandemics (1918 flu, SARS, MERS, H1N1, Ebola, COVID-19, Mpox), spread mechanisms, and containment strategies. Plain-language answers.
12. **Expanded epidemic parameters**: dropdown applied to all tabs — COVID-19, Influenza H1N1/H5N1, SARS, MERS, Ebola, Mpox, Zika, Nipah, Dengue, Cholera, Measles, Tuberculosis, Plague, + custom.
13. **National Vaccination Intelligence page**: per-pandemic dose count, inter-dose gap, efficacy curve, distribution optimization.
14. **Emergency Response Planning page**: population density heatmap, identifies over-/under-crowded districts, suggests redistribution based on COVID-era proven tactics (cordon sanitaire, ring vaccination, tiered lockdowns).
15. **Hospital Load + Vaccine Distribution charts**: convert horizontal bars → vertical (matching Pandemic Simulation styling).

---

## Notes

- Phases ship sequentially so you can review between each.
- Phase 1 is non-negotiable — security fix must land first.
- Phase 3 needs your approval to connect the Google Maps Platform connector.
- All changes propagate to citizen / admin / government views (with role-appropriate visibility).

**Reply "go" to start Phase 1, or tell me which phases to merge/skip/reorder.**
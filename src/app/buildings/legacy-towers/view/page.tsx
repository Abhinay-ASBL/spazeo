import { redirect } from 'next/navigation'

/** Canonical showcase path uses project slug. */
export default function LegacyTowersViewRedirect() {
  redirect('/buildings/asbl-legacy-towers/view')
}

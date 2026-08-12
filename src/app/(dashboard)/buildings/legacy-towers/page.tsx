import { redirect } from 'next/navigation'

/** Immersive showcase lives outside dashboard chrome. */
export default function LegacyTowersRedirectPage() {
  redirect('/buildings/legacy-towers/view')
}

import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'

export function useCurrentUser() {
  return useQuery(api.users.getCurrent)
}

export function useEnsureUser() {
  return useMutation(api.users.ensureUser)
}

export function useCompleteOnboarding() {
  return useMutation(api.users.completeOnboarding)
}

export function useSaveOnboardingStep() {
  return useMutation(api.users.saveOnboardingStep)
}

export function useUpdateProfile() {
  return useMutation(api.users.updateProfile)
}

export function useUpdateNotificationPreferences() {
  return useMutation(api.users.updateNotificationPreferences)
}

export function useDeleteAccount() {
  return useMutation(api.users.deleteAccount)
}

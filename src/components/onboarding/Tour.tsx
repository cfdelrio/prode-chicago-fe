import { useMemo } from 'react'
import { Joyride, STATUS } from 'react-joyride'
import type { EventData, Step } from 'react-joyride'
import { useT } from '@/hooks/useT'

const STORAGE_KEY = 'onboarding_seen_v1'

export function hasSeenOnboarding(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === '1' } catch { return false }
}

export function markOnboardingSeen(): void {
  try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* ignore */ }
}

export function resetOnboarding(): void {
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
}

interface Props {
  run: boolean
  onFinish: () => void
}

export function OnboardingTour({ run, onFinish }: Props) {
  const t = useT()

  const steps = useMemo<Step[]>(() => [
    {
      target: 'body',
      placement: 'center',
      title: t.onboarding.step1Title,
      content: t.onboarding.step1,
    },
    {
      target: '[data-tour="planilla-selector"]',
      title: t.onboarding.step2Title,
      content: t.onboarding.step2,
    },
    {
      target: '[data-tour="new-planilla"]',
      title: t.onboarding.step3Title,
      content: t.onboarding.step3,
    },
    {
      target: '[data-tour="filters"]',
      title: t.onboarding.step4Title,
      content: t.onboarding.step4,
    },
    {
      target: '[data-tour="match-list"]',
      title: t.onboarding.step5Title,
      content: t.onboarding.step5,
    },
    {
      target: 'body',
      placement: 'center',
      title: t.onboarding.step6Title,
      content: t.onboarding.step6,
    },
  ], [t])

  const handleEvent = (data: EventData) => {
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      markOnboardingSeen()
      onFinish()
    }
  }

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      onEvent={handleEvent}
      options={{
        primaryColor: '#0042A5',
        textColor: '#001A4B',
        zIndex: 10000,
        backgroundColor: '#ffffff',
        arrowColor: '#ffffff',
        overlayColor: 'rgba(0, 26, 75, 0.55)',
        showProgress: true,
        skipBeacon: true,
        buttons: ['back', 'skip', 'primary'],
        scrollOffset: 80,
      }}
      locale={{
        back: t.onboarding.back,
        close: t.onboarding.close,
        last: t.onboarding.last,
        next: t.onboarding.next,
        nextWithProgress: t.onboarding.nextWithProgress,
        skip: t.onboarding.skip,
      }}
    />
  )
}

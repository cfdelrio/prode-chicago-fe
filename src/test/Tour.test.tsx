import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import {
  OnboardingTour,
  hasSeenOnboarding,
  markOnboardingSeen,
  resetOnboarding,
} from '@/components/onboarding/Tour'

const STORAGE_KEY = 'onboarding_seen_v1'

// ─── Mock react-joyride: rendered as a div that captures props ────────────────

const joyrideProps = vi.hoisted(() => ({ current: null as any }))

vi.mock('react-joyride', () => {
  const STATUS = { FINISHED: 'finished', SKIPPED: 'skipped', RUNNING: 'running' }
  return {
    STATUS,
    Joyride: (props: any) => {
      joyrideProps.current = props
      return <div data-testid="joyride-mock" data-run={String(props.run)} data-steps={props.steps.length} />
    },
  }
})

// ─── Mock useT con strings simples ────────────────────────────────────────────

vi.mock('@/hooks/useT', () => ({
  useT: () => ({
    onboarding: {
      step1Title: 'T1', step1: 'C1',
      step2Title: 'T2', step2: 'C2',
      step3Title: 'T3', step3: 'C3',
      step4Title: 'T4', step4: 'C4',
      step5Title: 'T5', step5: 'C5',
      step6Title: 'T6', step6: 'C6',
      back: 'Atrás', close: 'Cerrar', last: 'Último',
      next: 'Siguiente', nextWithProgress: 'Siguiente {step}/{steps}',
      skip: 'Saltar',
    },
  }),
}))

// ─── Helpers de localStorage ──────────────────────────────────────────────────

describe('Tour — helpers de localStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('hasSeenOnboarding: false por defecto', () => {
    expect(hasSeenOnboarding()).toBe(false)
  })

  it('markOnboardingSeen escribe la flag y hasSeenOnboarding la lee', () => {
    markOnboardingSeen()
    expect(localStorage.getItem(STORAGE_KEY)).toBe('1')
    expect(hasSeenOnboarding()).toBe(true)
  })

  it('resetOnboarding limpia la flag', () => {
    markOnboardingSeen()
    expect(hasSeenOnboarding()).toBe(true)
    resetOnboarding()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(hasSeenOnboarding()).toBe(false)
  })

  it('hasSeenOnboarding: tolera errores de localStorage', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(hasSeenOnboarding()).toBe(false)
    spy.mockRestore()
  })

  it('markOnboardingSeen: tolera errores de localStorage', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => markOnboardingSeen()).not.toThrow()
    spy.mockRestore()
  })

  it('resetOnboarding: tolera errores de localStorage', () => {
    const spy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => resetOnboarding()).not.toThrow()
    spy.mockRestore()
  })
})

// ─── Componente ───────────────────────────────────────────────────────────────

describe('Tour — OnboardingTour', () => {
  beforeEach(() => {
    localStorage.clear()
    joyrideProps.current = null
  })
  afterEach(() => vi.clearAllMocks())

  it('renderiza Joyride con run=true y 6 pasos', () => {
    const { getByTestId } = render(<OnboardingTour run={true} onFinish={vi.fn()} />)
    const el = getByTestId('joyride-mock')
    expect(el.getAttribute('data-run')).toBe('true')
    expect(el.getAttribute('data-steps')).toBe('6')
  })

  it('renderiza Joyride con run=false', () => {
    const { getByTestId } = render(<OnboardingTour run={false} onFinish={vi.fn()} />)
    expect(getByTestId('joyride-mock').getAttribute('data-run')).toBe('false')
  })

  it('los steps incluyen títulos y targets esperados', () => {
    render(<OnboardingTour run={true} onFinish={vi.fn()} />)
    const steps = joyrideProps.current.steps
    expect(steps[0]).toMatchObject({ target: 'body', placement: 'center', title: 'T1', content: 'C1' })
    expect(steps[1]).toMatchObject({ target: '[data-tour="planilla-selector"]', title: 'T2' })
    expect(steps[2]).toMatchObject({ target: '[data-tour="new-planilla"]', title: 'T3' })
    expect(steps[3]).toMatchObject({ target: '[data-tour="filters"]', title: 'T4' })
    expect(steps[4]).toMatchObject({ target: '[data-tour="match-list"]', title: 'T5' })
    expect(steps[5]).toMatchObject({ target: 'body', placement: 'center', title: 'T6' })
  })

  it('locale recibe las traducciones desde useT', () => {
    render(<OnboardingTour run={true} onFinish={vi.fn()} />)
    expect(joyrideProps.current.locale).toEqual({
      back: 'Atrás',
      close: 'Cerrar',
      last: 'Último',
      next: 'Siguiente',
      nextWithProgress: 'Siguiente {step}/{steps}',
      skip: 'Saltar',
    })
  })

  it('onEvent con status FINISHED → marca como visto y llama onFinish', () => {
    const onFinish = vi.fn()
    render(<OnboardingTour run={true} onFinish={onFinish} />)
    joyrideProps.current.onEvent({ status: 'finished' } as any)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('1')
    expect(onFinish).toHaveBeenCalledTimes(1)
  })

  it('onEvent con status SKIPPED → marca como visto y llama onFinish', () => {
    const onFinish = vi.fn()
    render(<OnboardingTour run={true} onFinish={onFinish} />)
    joyrideProps.current.onEvent({ status: 'skipped' } as any)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('1')
    expect(onFinish).toHaveBeenCalledTimes(1)
  })

  it('onEvent con status RUNNING → no marca ni llama onFinish', () => {
    const onFinish = vi.fn()
    render(<OnboardingTour run={true} onFinish={onFinish} />)
    joyrideProps.current.onEvent({ status: 'running' } as any)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(onFinish).not.toHaveBeenCalled()
  })
})

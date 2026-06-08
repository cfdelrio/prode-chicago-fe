import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { GoogleAdUnit } from '@/components/ui/GoogleAdUnit'

describe('GoogleAdUnit', () => {
  beforeEach(() => {
    // Reset adsbygoogle
    delete (window as any).adsbygoogle
  })
  afterEach(() => vi.restoreAllMocks())

  it('renderiza el elemento <ins> con el slot correcto', () => {
    const { container } = render(<GoogleAdUnit slot="1234567890" />)
    const ins = container.querySelector('ins.adsbygoogle')!
    expect(ins).not.toBeNull()
    expect(ins.getAttribute('data-ad-slot')).toBe('1234567890')
    expect(ins.getAttribute('data-ad-client')).toBe('ca-pub-2237175852397146')
  })

  it('usa format="auto" por defecto', () => {
    const { container } = render(<GoogleAdUnit slot="111" />)
    const ins = container.querySelector('ins')!
    expect(ins.getAttribute('data-ad-format')).toBe('auto')
  })

  it('usa el format prop cuando se provee', () => {
    const { container } = render(<GoogleAdUnit slot="111" format="rectangle" />)
    const ins = container.querySelector('ins')!
    expect(ins.getAttribute('data-ad-format')).toBe('rectangle')
  })

  it('está oculto inicialmente (height: 0)', () => {
    const { container } = render(<GoogleAdUnit slot="111" />)
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.style.height).toBe('0px')
    expect(wrapper.style.overflow).toBe('hidden')
  })

  it('llama a adsbygoogle.push({}) en el montaje', () => {
    const push = vi.fn()
    ;(window as any).adsbygoogle = { push }
    render(<GoogleAdUnit slot="111" />)
    expect(push).toHaveBeenCalledWith({})
  })

  it('inicializa window.adsbygoogle si no existe', () => {
    expect((window as any).adsbygoogle).toBeUndefined()
    render(<GoogleAdUnit slot="111" />)
    expect((window as any).adsbygoogle).toBeDefined()
  })

  it('se vuelve visible cuando data-ad-status cambia a "filled"', async () => {
    const { container } = render(<GoogleAdUnit slot="111" />)
    const ins = container.querySelector('ins')!

    await act(async () => {
      ins.setAttribute('data-ad-status', 'filled')
      // Trigger MutationObserver callbacks
      await new Promise(r => setTimeout(r, 0))
    })

    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.style.height).toBe('')
    expect(wrapper.style.opacity).toBe('1')
  })

  it('permanece oculto cuando data-ad-status es cualquier otro valor', async () => {
    const { container } = render(<GoogleAdUnit slot="111" />)
    const ins = container.querySelector('ins')!

    await act(async () => {
      ins.setAttribute('data-ad-status', 'unfilled')
      await new Promise(r => setTimeout(r, 0))
    })

    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.style.height).toBe('0px')
  })
})

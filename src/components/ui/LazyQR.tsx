import { lazy, Suspense, type ComponentProps } from 'react'

const QRCodeSVG = lazy(() =>
  import('qrcode.react').then(m => ({ default: m.QRCodeSVG }))
)

type Props = ComponentProps<typeof QRCodeSVG>

export function LazyQR(props: Props) {
  const size = props.size ?? 128
  return (
    <Suspense
      fallback={
        <div
          className="bg-gray-100 rounded animate-pulse"
          style={{ width: size, height: size }}
          aria-label="Cargando código QR"
        />
      }
    >
      <QRCodeSVG {...props} />
    </Suspense>
  )
}

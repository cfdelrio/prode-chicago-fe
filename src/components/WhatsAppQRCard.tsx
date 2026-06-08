interface Props {
  title?: string
  description?: string
  showButton?: boolean
}

export function WhatsAppQRCard({
  title = '📲 Unirse para recibir novedades',
  description = 'Escanear el código con WhatsApp para enterarte de todas las novedades, resultados y cambios de ranking en tiempo real.',
  showButton = false,
}: Props) {
  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 text-center space-y-4">
      <h3 className="font-black text-lg text-green-900">{title}</h3>
      <p className="text-sm text-green-800 leading-relaxed">{description}</p>

      {/* QR Code */}
      <div className="flex justify-center py-4">
        <div className="bg-white p-3 rounded-lg border border-green-200 shadow-md">
          <img
            src="/download.svg"
            alt="QR code para unirse a WhatsApp"
            className="w-40 h-40"
          />
        </div>
      </div>

      <p className="text-xs text-green-700">
        Abrí WhatsApp en tu teléfono y escaneá este código para comenzar a recibir notificaciones.
      </p>

      {showButton && (
        <button
          onClick={() => {
            const whatsappUrl = 'https://wa.me/?text=Quiero%20recibir%20notificaciones%20del%20PRODE'
            window.open(whatsappUrl, '_blank')
          }}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg transition-colors"
        >
          Abrir WhatsApp
        </button>
      )}
    </div>
  )
}

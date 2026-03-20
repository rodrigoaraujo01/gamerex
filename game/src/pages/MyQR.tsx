import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../lib/auth'
import Navbar from '../components/Navbar'

const BASE_URL = 'https://gamerex.win'

export default function MyQR() {
  const { user } = useAuth()

  if (!user) return null

  const qrValue = `${BASE_URL}/#/scan/U-${user.id}`

  return (
    <div className="min-h-dvh pb-nav-safe page-enter">
      <div className="bg-rex-card border-b border-rex-border px-4 py-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-white font-semibold text-lg">Meu QR Code</h1>
          <p className="text-gray-500 text-sm">Peça a um colega para escanear!</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col items-center">
        <div className="bg-white rounded-2xl p-6 mb-6">
          <QRCodeSVG
            value={qrValue}
            size={240}
            level="M"
            includeMargin={false}
          />
        </div>

        <p className="text-white font-semibold text-lg">{user.name}</p>
        <p className="text-gray-500 text-sm mt-1">{user.email}</p>

        <div className="bg-rex-card border border-rex-border rounded-xl p-4 mt-6 max-w-xs text-center">
          <p className="text-gray-400 text-sm">
            📱 Quando alguém escanear seu QR, <span className="text-rex-green">vocês dois</span> ganham pontos de networking!
          </p>
        </div>

        <div className="bg-rex-card border border-rex-border rounded-xl p-4 mt-3 max-w-xs text-center">
          <p className="text-gray-400 text-sm">
            🔄 Um checkin por amigo por dia. Encontre as mesmas pessoas nos 3 dias para completar a missão <span className="text-rex-amber">BFF</span>!
          </p>
        </div>
      </div>

      <Navbar />
    </div>
  )
}

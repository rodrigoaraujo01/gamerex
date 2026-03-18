import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 text-center page-enter">
      {/* Rex mascot */}
      <div className="text-8xl mb-4 drop-shadow-lg" aria-hidden>🦖</div>

      <h1 className="font-game text-rex-green text-xl sm:text-2xl mb-2">
        GameREX
      </h1>
      <p className="text-gray-400 text-sm mb-1">SIDARE 2026</p>
      <p className="text-gray-500 text-xs mb-8 max-w-xs">
        Escaneie QR Codes, complete missões e conquiste o topo do ranking!
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          to="/register"
          className="bg-rex-green text-rex-bg font-semibold rounded-xl py-3 px-6 text-center hover:bg-rex-green-dark transition-colors"
        >
          🎮 Começar a jogar
        </Link>
        <Link
          to="/register?mode=login"
          className="border border-rex-border text-gray-300 rounded-xl py-3 px-6 text-center hover:border-rex-green/50 transition-colors"
        >
          Já tenho conta
        </Link>
      </div>

      <p className="text-gray-600 text-xs mt-12">
        23–25 de março · RR-EE & EXP
      </p>
    </div>
  )
}

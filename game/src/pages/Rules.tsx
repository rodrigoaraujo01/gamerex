import { useNavigate } from 'react-router-dom'
import { LEVELS } from '../lib/missions'
import Navbar from '../components/Navbar'

export default function Rules() {
  const navigate = useNavigate()

  return (
    <div className="min-h-dvh pb-20 page-enter">
      <div className="bg-rex-card border-b border-rex-border px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-white font-semibold text-lg">Como Jogar</h1>
            <p className="text-gray-500 text-sm">Regras do GameREX</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* O que é */}
        <section className="bg-rex-card border border-rex-border rounded-2xl p-5">
          <h2 className="text-white font-semibold text-base mb-2">🦖 O que é o GameREX?</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            O GameREX é o jogo de gamificação do SIDARE 2026! Participe das atividades do evento,
            escaneie QR Codes e acumule pontos para subir no ranking.
          </p>
        </section>

        {/* Como funciona */}
        <section className="bg-rex-card border border-rex-border rounded-2xl p-5">
          <h2 className="text-white font-semibold text-base mb-2">📷 Como funciona?</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Cada atividade do evento tem um <span className="text-white">QR Code</span> exclusivo.
            Basta escanear com a câmera do celular para registrar sua participação e ganhar pontos.
          </p>
          <p className="text-gray-400 text-sm leading-relaxed mt-2">
            Os QR Codes estão disponíveis nas apresentações orais, posters, plenárias,
            stands da Mini-Expo, atividades do SIRR Web e no Happy Hour.
          </p>
        </section>

        {/* Pontuação */}
        <section className="bg-rex-card border border-rex-border rounded-2xl p-5">
          <h2 className="text-white font-semibold text-base mb-2">⭐ Pontuação</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-rex-green font-semibold w-16 text-right">+10 pts</span>
              <span className="text-gray-400">Cada checkin em atividade</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-rex-green font-semibold w-16 text-right">+10 pts</span>
              <span className="text-gray-400">Cada encontro com amigo</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-rex-amber font-semibold w-16 text-right">Bônus</span>
              <span className="text-gray-400">Missões completas (20–300 pts)</span>
            </div>
          </div>
        </section>

        {/* Missões */}
        <section className="bg-rex-card border border-rex-border rounded-2xl p-5">
          <h2 className="text-white font-semibold text-base mb-2">🎯 Missões</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            São desafios especiais que dão <span className="text-rex-amber">pontos bônus</span> ao
            serem completados. Exemplos: visitar todas as salas em um dia, assistir a apresentações
            de todas as trilhas, fazer networking com vários participantes.
          </p>
          <p className="text-gray-400 text-sm leading-relaxed mt-2">
            Algumas missões são progressivas — acompanhe seu progresso na aba <span className="text-white">Missões</span>.
          </p>
        </section>

        {/* Networking */}
        <section className="bg-rex-card border border-rex-border rounded-2xl p-5">
          <h2 className="text-white font-semibold text-base mb-2">🤝 Networking</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Cada jogador tem um <span className="text-white">QR Code pessoal</span> na aba QR.
            Quando dois participantes escaneiam o QR um do outro, ambos ganham pontos de networking!
          </p>
          <p className="text-gray-400 text-sm leading-relaxed mt-2">
            Você pode escanear o mesmo amigo uma vez por dia (3 oportunidades ao longo do evento).
          </p>
        </section>

        {/* Níveis */}
        <section className="bg-rex-card border border-rex-border rounded-2xl p-5">
          <h2 className="text-white font-semibold text-base mb-2">🏅 Níveis</h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-3">
            Conforme você acumula pontos, seu nível sobe automaticamente:
          </p>
          <div className="space-y-2">
            {LEVELS.map((l, i) => {
              const next = LEVELS[i + 1]
              return (
                <div key={l.title} className="flex items-center gap-3 bg-rex-bg rounded-xl px-3 py-2">
                  <span className="text-xl w-8 text-center">{l.emoji}</span>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{l.title}</p>
                    <p className="text-gray-500 text-xs">
                      {next
                        ? `${l.minPoints}–${next.minPoints - 1} pts`
                        : `${l.minPoints}+ pts`}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Ranking */}
        <section className="bg-rex-card border border-rex-border rounded-2xl p-5">
          <h2 className="text-white font-semibold text-base mb-2">🏆 Ranking</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            O ranking considera sua pontuação total: checkins + amigos + bônus de missões.
            Os 3 primeiros colocados ao final do evento serão premiados!
          </p>
        </section>

        {/* Dicas */}
        <section className="bg-rex-card border border-rex-green/30 rounded-2xl p-5">
          <h2 className="text-white font-semibold text-base mb-2">💡 Dicas</h2>
          <ul className="text-gray-400 text-sm space-y-1.5 list-disc list-inside">
            <li>Participe de todos os 3 dias para desbloquear mais missões</li>
            <li>Diversifique entre orais, posters e plenárias</li>
            <li>Não esqueça de fazer networking — rende pontos e missões!</li>
            <li>Visite os stands da Mini-Expo e o SIRR Web</li>
          </ul>
        </section>
      </div>

      <Navbar />
    </div>
  )
}

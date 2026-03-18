import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/dashboard', icon: '🏠', label: 'Início' },
  { to: '/missions', icon: '🎯', label: 'Missões' },
  { to: '/myqr', icon: '📱', label: 'QR' },
  { to: '/ranking', icon: '🏆', label: 'Ranking' },
  { to: '/history', icon: '📋', label: 'Histórico' },
]

export default function Navbar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-rex-card border-t border-rex-border">
      <div className="max-w-lg mx-auto flex">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2.5 text-xs transition-colors ${
                isActive ? 'text-rex-green' : 'text-gray-500 hover:text-gray-300'
              }`
            }
          >
            <span className="text-lg mb-0.5">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

import { Link, useLocation } from 'react-router-dom'

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/knowledge', label: 'Knowledge Base' },
  { to: '/model-settings', label: 'Model Settings' },
]

export default function Nav({ onLogout }) {
  const { pathname } = useLocation()

  return (
    <nav className="flex items-center gap-6 px-6 py-3 border-b border-stone-200 bg-white shadow-sm">
      <span className="font-bold text-lg" style={{ color: 'var(--dark-green)' }}>
        🪵 CarpentryEst
      </span>
      <div className="flex gap-4 flex-1">
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className={`text-sm font-medium px-3 py-1 rounded-md transition-colors ${
              pathname === l.to
                ? 'text-white'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
            style={pathname === l.to ? { backgroundColor: 'var(--dark-green)' } : {}}
          >
            {l.label}
          </Link>
        ))}
      </div>
      <button
        onClick={onLogout}
        className="text-sm text-stone-500 hover:text-stone-900 transition-colors"
      >
        Sign out
      </button>
    </nav>
  )
}

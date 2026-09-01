import { Link } from '@tanstack/react-router'

const linkBase =
  'rounded-md px-2 py-1 text-slate-700 transition hover:bg-slate-100 hover:text-slate-900'
const linkActive = 'rounded-md px-2 py-1 bg-sky-50 text-sky-700 font-semibold'

export function AppNav() {
  return (
    <nav
      aria-label="Main"
      className="flex flex-wrap gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium"
    >
      <Link
        to="/"
        activeOptions={{ exact: true }}
        className={linkBase}
        activeProps={{ className: linkActive }}
      >
        Home
      </Link>
      <Link
        to="/players"
        search={{ position: 'all', status: 'active' }}
        activeOptions={{ exact: false }}
        className={linkBase}
        activeProps={{ className: linkActive }}
      >
        Players
      </Link>
      <Link
        to="/games"
        search={{ team: '', date: '' }}
        activeOptions={{ exact: false }}
        className={linkBase}
        activeProps={{ className: linkActive }}
      >
        Games
      </Link>
    </nav>
  )
}

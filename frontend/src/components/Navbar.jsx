import { Link, useLocation } from 'react-router-dom'
import { GitBranch, Home, Compass, BookOpen } from 'lucide-react'

export default function Navbar({ currentDataset, onLoadDataset }) {
  const location = useLocation()
  const isActive = (path) => location.pathname === path

  return (
    <nav className="glass border-b border-border px-6 py-3 flex items-center justify-between z-50 sticky top-0">
      <Link to="/" className="flex items-center gap-2.5 group">
        <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
          <GitBranch size={18} className="text-accent" />
        </div>
        <span className="text-lg font-bold tracking-tight">
          Claim<span className="text-accent">Graph</span>
        </span>
      </Link>

      <div className="flex items-center gap-1">
        <NavLink to="/" active={isActive('/')} icon={<Home size={16} />} label="Home" />
        <NavLink to="/explore" active={isActive('/explore')} icon={<Compass size={16} />} label="Explorer" />
        <NavLink to="/algorithms" active={isActive('/algorithms')} icon={<BookOpen size={16} />} label="Algorithms" />
      </div>
    </nav>
  )
}

function NavLink({ to, active, icon, label }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'bg-accent/15 text-accent'
          : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
      }`}
    >
      {icon}
      {label}
    </Link>
  )
}

import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Bell, Home, ShoppingBasket } from "lucide-react";
import { isModuleActive, modules } from "../modules.js";

// liens du menu
const side = ({ isActive }) =>
  `flex items-center justify-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition lg:justify-start ${
    isActive
      ? "bg-brand-cream text-emerald-800 shadow-lg"
      : "text-brand-sand hover:bg-white/10 hover:text-white"
  }`;
export default function Layout() {
  const { pathname } = useLocation();
  const active = modules.find((m) => isModuleActive(m, pathname));

  return (
    <div className="min-h-screen">
      {/* ============ NAVBAR EN HAUT ============ */}
<header className="glass fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-t-4 border-t-brand-orange border-b border-b-brand-sand/30 px-4 lg:px-6">

        <Link to="/" className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
            <ShoppingBasket size={20} />
          </div>
          <span className="hidden text-lg font-extrabold text-slate-800 sm:block">
            TuniSupply<span className="text-emerald-600">AI</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `rounded-xl px-3 py-2 text-sm font-semibold transition ${
                isActive ? "bg-emerald-50 text-emerald-700" : "text-slate-500 hover:text-emerald-700"
              }`
            }
          >
            Accueil
          </NavLink>
          {modules.map((m) => (
            <Link
              key={m.key}
              to={m.base}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                active?.key === m.key ? "bg-emerald-50 text-emerald-700" : "text-slate-500 hover:text-emerald-700"
              }`}
            >
              {m.short}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition hover:bg-emerald-50">
            <Bell size={19} />
          </button>
          <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white">
            TS
          </div>
        </div>
      </header>

      {/* ============ BARRE VERTICALE À GAUCHE ============ */}
<aside className="fixed bottom-0 left-0 top-16 z-20 flex w-20 flex-col bg-gradient-to-b from-teal-700 via-teal-800 to-brand-dark p-3 lg:w-64 lg:p-5">   
        <nav className="flex flex-1 flex-col gap-2 overflow-y-auto">
          <NavLink to="/" end title="Accueil" className={side}>
            <Home size={20} />
            <span className="hidden lg:inline">Accueil</span>
          </NavLink>

          <p className="mt-4 hidden px-3 text-xs font-bold uppercase tracking-wider text-slate-400 lg:block">
            {active ? active.title : "Modules"}
          </p>

          {active
            ? active.actions.map(({ label, icon: Icon, to, end }) =>
                to ? (
                  <NavLink key={label} to={to} end={end} title={label} className={side}>
                    <Icon size={20} />
                    <span className="hidden lg:inline">{label}</span>
                  </NavLink>
                ) : (
                  <div
                    key={label}
                    title={`${label} (bientôt)`}
                    className="flex cursor-not-allowed items-center justify-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-300 lg:justify-start"
                  >
                    <Icon size={20} />
                    <span className="hidden lg:inline">{label}</span>
                  </div>
                )
              )
            : modules.map(({ key, title, icon: Icon, base }) => (
                <NavLink key={key} to={base} title={title} className={side}>
                  <Icon size={20} />
                  <span className="hidden lg:inline">{title}</span>
                </NavLink>
              ))}
        </nav>

        <div className="hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-white lg:block">
          <p className="text-sm font-bold">Besoin d'aide ?</p>
          <p className="mt-1 text-xs text-emerald-50">Chaque module est géré par un membre de l'équipe.</p>
        </div>
      </aside>

      {/* ============ CONTENU ============ */}
      <main className="min-h-screen pl-20 pt-16 lg:pl-64">
        <div className="mx-auto max-w-6xl p-6 lg:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
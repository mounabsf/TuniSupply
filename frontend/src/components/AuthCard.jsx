import { Link } from "react-router-dom";
import { ShoppingBasket } from "lucide-react";

// Carte centrée utilisée par les pages Connexion et Inscription.
export default function AuthCard({ title, subtitle, children, footer, wide = false }) {
  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className={`w-full ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <Link to="/login" className="mx-auto mb-6 flex w-fit items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
            <ShoppingBasket size={22} />
          </div>
          <span className="text-xl font-extrabold text-slate-800">
            TuniSupply<span className="text-emerald-600">AI</span>
          </span>
        </Link>

        <div className="rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/60">
          <h1 className="text-2xl font-extrabold text-slate-800">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          {children}
        </div>

        {footer && <p className="mt-5 text-center text-sm text-slate-500">{footer}</p>}
      </div>
    </div>
  );
}

import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { ShieldOff } from "lucide-react";
import { useAuth } from "./context.js";

function Chargement() {
  return <div className="grid min-h-screen place-items-center text-slate-400">Chargement…</div>;
}

function Interdit() {
  return (
    <div className="mx-auto max-w-lg rounded-3xl bg-white p-10 text-center shadow-xl shadow-slate-200/60">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-rose-50 text-rose-500">
        <ShieldOff size={30} />
      </div>
      <h1 className="mt-5 text-2xl font-extrabold text-slate-800">Accès refusé</h1>
      <p className="mt-2 text-slate-500">Votre rôle ne permet pas d'accéder à cette page.</p>
      <Link to="/" className="mt-6 inline-block rounded-xl bg-emerald-600 px-6 py-2.5 font-semibold text-white hover:bg-emerald-700">
        Retour à l'accueil
      </Link>
    </div>
  );
}

// Route « layout » : <Route element={<RequireAuth roles={["ADMIN"]} />}> … </Route>
export default function RequireAuth({ roles }) {
  const { user } = useAuth();
  const location = useLocation();

  if (user === undefined) return <Chargement />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Interdit />;
  return <Outlet />;
}

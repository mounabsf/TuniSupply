import { Link } from "react-router-dom";
import { Hammer } from "lucide-react";

export default function ComingSoon({ module: m }) {
  return (
    <div className="mx-auto max-w-lg rounded-3xl bg-white p-10 text-center shadow-xl shadow-slate-200/60">
      <div className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl ${m.tone.bg} ${m.tone.text}`}>
        <Hammer size={30} />
      </div>
      <h1 className="mt-5 text-2xl font-extrabold text-slate-800">{m.title}</h1>
      <p className="mt-2 text-slate-500">
        Ce module est en cours de développement par <strong>{m.owner}</strong>.
      </p>
      <Link to="/" className="mt-6 inline-block rounded-xl bg-emerald-600 px-6 py-2.5 font-semibold text-white hover:bg-emerald-700">
        Retour à l'accueil
      </Link>
    </div>
  );
}
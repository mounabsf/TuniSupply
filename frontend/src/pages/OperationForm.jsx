import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { messagesErreur } from "../roles.js";

const input = "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

export default function OperationForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [datePrevue, setDatePrevue] = useState("");
  const [itineraire, setItineraire] = useState("");
  const [logisticiens, setLogisticiens] = useState([]);
  const [centres, setCentres] = useState([]);
  const [lots, setLots] = useState([]);
  const [logisticien, setLogisticien] = useState("");
  const [centreDepart, setCentreDepart] = useState("");
  const [ressources, setRessources] = useState([]);
  const [erreurs, setErreurs] = useState([]);
  const [erreurChargement, setErreurChargement] = useState("");
  const [editable, setEditable] = useState(true);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    let active = true;

    Promise.all([
      api.get("/logisticiens/"),
      api.get("/ressources/centres/"),
      api.get("/ressources/lots/"),
      id ? api.get(`/operations/${id}/`) : Promise.resolve(null),
    ])
      .then(([listeLogisticiens, listeCentres, listeLots, operation]) => {
        if (!active) return;
        setLogisticiens(listeLogisticiens);
        setCentres(listeCentres);
        setLots(listeLots);
        if (operation) {
          setDatePrevue(operation.date_prevue);
          setItineraire(operation.itineraire_optimise);
          setLogisticien(operation.logisticien ? String(operation.logisticien) : "");
          setCentreDepart(operation.centre_depart ? String(operation.centre_depart) : "");
          setRessources((operation.ressources || []).map(String));
          setEditable(operation.peut_modifier);
          if (!operation.peut_modifier) {
            setErreurs(["Seule une opération planifiée peut être modifiée."]);
          }
        }
      })
      .catch((err) => {
        if (active) setErreurChargement(messagesErreur(err).join(" "));
      })
      .finally(() => {
        if (active) setChargement(false);
      });

    return () => { active = false; };
  }, [id]);

  const changerCentre = (value) => {
    setCentreDepart(value);
    setRessources((selection) =>
      selection.filter((resourceId) =>
        lots.some((lot) => String(lot.id) === resourceId && String(lot.centre) === value),
      ),
    );
  };

  const changerRessource = (event) => {
    const { checked, value } = event.target;
    setRessources((selection) =>
      checked
        ? [...new Set([...selection, value])]
        : selection.filter((resourceId) => resourceId !== value),
    );
  };

  const envoyer = async (event) => {
    event.preventDefault();
    setErreurs([]);
    const data = {
      date_prevue: datePrevue,
      itineraire_optimise: itineraire,
      logisticien: Number(logisticien),
      centre_depart: Number(centreDepart),
      ressources: ressources.map(Number),
    };
    try {
      if (id) await api.put(`/operations/${id}/`, data);
      else await api.post("/operations/", data);
      navigate("/logistique");
    } catch (err) {
      setErreurs(messagesErreur(err));
    }
  };

  if (chargement) {
    return <p className="rounded-3xl bg-white p-8 text-center text-slate-500">Chargement de l’opération…</p>;
  }

  if (erreurChargement || !editable) {
    return (
      <div className="rounded-3xl bg-white p-8 shadow-lg">
        <p role="alert" className="text-sm text-rose-600">
          {erreurChargement || erreurs[0]}
        </p>
        <Link to="/logistique" className="mt-5 inline-flex rounded-xl border border-slate-200 px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-50">
          Retour aux opérations
        </Link>
      </div>
    );
  }

  const lotsDuCentre = lots.filter((lot) => String(lot.centre) === centreDepart);

  return (
    <form onSubmit={envoyer} className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/60">
      <h1 className="text-2xl font-extrabold text-slate-800">
        {id ? "Modifier l’opération logistique" : "Planifier une opération logistique"}
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Une opération peut être modifiée uniquement tant qu’elle est planifiée.
      </p>

      <label htmlFor="date-prevue" className="mt-6 block text-sm font-semibold">Date prévue</label>
      <input
        id="date-prevue"
        type="date"
        required
        className={`${input} mt-1`}
        value={datePrevue}
        onChange={(event) => setDatePrevue(event.target.value)}
      />

      <label htmlFor="logisticien" className="mt-5 block text-sm font-semibold">Logisticien responsable</label>
      <select
        id="logisticien"
        required
        className={`${input} mt-1`}
        value={logisticien}
        onChange={(event) => setLogisticien(event.target.value)}
      >
        <option value="">-- Choisir un logisticien --</option>
        {logisticiens.map((personne) => (
          <option key={personne.id} value={personne.id}>
            {personne.nom}{personne.depot_rattachement ? ` — ${personne.depot_rattachement}` : ""}
          </option>
        ))}
      </select>

      <label htmlFor="centre-depart" className="mt-5 block text-sm font-semibold">Centre de départ</label>
      <select
        id="centre-depart"
        required
        className={`${input} mt-1`}
        value={centreDepart}
        onChange={(event) => changerCentre(event.target.value)}
      >
        <option value="">-- Choisir un centre --</option>
        {centres.map((centre) => (
          <option key={centre.id} value={centre.id}>{centre.nom}</option>
        ))}
      </select>

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold">Ressources transportées</legend>
        {!centreDepart ? (
          <p className="mt-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            Choisissez un centre de départ pour afficher ses lots.
          </p>
        ) : lotsDuCentre.length === 0 ? (
          <p className="mt-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            Aucun lot n’est disponible dans ce centre.
          </p>
        ) : (
          <div className="mt-2 max-h-56 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3">
            {lotsDuCentre.map((lot) => (
              <label key={lot.id} className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-slate-50">
                <input
                  type="checkbox"
                  value={lot.id}
                  checked={ressources.includes(String(lot.id))}
                  onChange={changerRessource}
                  className="mt-1 h-4 w-4 rounded accent-emerald-600"
                />
                <span className="text-sm text-slate-700">
                  <span className="font-semibold">{lot.id_lot}</span> — {lot.type_ressource}
                </span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <label htmlFor="itineraire" className="mt-5 block text-sm font-semibold">Itinéraire optimisé</label>
      <textarea
        id="itineraire"
        required
        rows={5}
        className={`${input} mt-1`}
        value={itineraire}
        onChange={(event) => setItineraire(event.target.value)}
        placeholder="Décrivez l’itinéraire prévu"
      />

      {erreurs.length > 0 && (
        <div role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-600">
          {erreurs.map((erreur) => <p key={erreur}>{erreur}</p>)}
        </div>
      )}

      <div className="mt-8 flex justify-end gap-3">
        <Link to="/logistique" className="rounded-xl border border-slate-200 px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-50">
          Retour
        </Link>
        <button className="rounded-xl bg-emerald-600 px-6 py-2.5 font-semibold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700">
          Enregistrer
        </button>
      </div>
    </form>
  );
}

import { useCallback, useEffect, useState } from "react";
import { archiverFournisseur, changerStatut, listFournisseurs } from "../api/fournisseurs";
import ConfirmArchiveDialog from "../components/ConfirmArchiveDialog";
import FournisseurForm from "../components/FournisseurForm";
import LivraisonsFournisseur from "../components/LivraisonsFournisseur";
import StatutBadge, { STATUTS, STATUTS_MODIFIABLES } from "../components/StatutBadge";

const FILTRES = [["TOUS", "Tous"], ...STATUTS_MODIFIABLES.map((s) => [s, STATUTS[s].label])];
const formatDate = (iso) => new Date(iso).toLocaleDateString("fr-FR");

function Pill({ actif, onClick, children }) {
  return (
    <button onClick={onClick} aria-pressed={actif}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              actif ? "bg-rouille text-white" : "bg-white text-brun/70 hover:bg-white/60"}`}>
      {children}
    </button>
  );
}

export default function Fournisseurs() {
  const [vue, setVue] = useState({ nom: "liste" }); // liste | nouveau | historique
  const [fournisseurs, setFournisseurs] = useState([]);
  const [filtre, setFiltre] = useState("TOUS");
  const [archives, setArchives] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [aArchiver, setAArchiver] = useState(null);

  const charger = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setFournisseurs(await listFournisseurs(archives));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [archives]);

  useEffect(() => { charger(); }, [charger]);

  async function onStatut(f, statut) {
    if (statut === f.statut) return;
    setBusyId(f.id);
    setError("");
    try {
      const maj = await changerStatut(f.id, statut);
      setFournisseurs((liste) => liste.map((x) => (x.id === maj.id ? maj : x)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function confirmerArchivage() {
    setBusyId(aArchiver.id);
    try {
      const maj = await archiverFournisseur(aArchiver.id);
      setFournisseurs((liste) =>
        archives ? liste.map((x) => (x.id === maj.id ? maj : x)) : liste.filter((x) => x.id !== maj.id)
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
      setAArchiver(null);
    }
  }

  const visibles = fournisseurs.filter((f) => filtre === "TOUS" || f.statut === filtre);

  if (vue.nom === "nouveau") {
    return (
      <div className="mx-auto w-full max-w-5xl px-6 py-8">
        <FournisseurForm
          onCancel={() => setVue({ nom: "liste" })}
          onSaved={() => { setVue({ nom: "liste" }); charger(); }}
        />
      </div>
    );
  }

  if (vue.nom === "historique") {
    return (
      <div className="mx-auto w-full max-w-5xl px-6 py-8">
        <LivraisonsFournisseur fournisseur={vue.fournisseur} onBack={() => setVue({ nom: "liste" })} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-brun">Fournisseurs</h1>
          <p className="mt-1 text-sm text-brun/60">Gérez les fournisseurs, leur statut et leurs livraisons.</p>
        </div>
        <button onClick={() => setVue({ nom: "nouveau" })}
                className="rounded-xl bg-rouille px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-rouille-dark">
          + Nouveau fournisseur
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {FILTRES.map(([cle, label]) => (
          <Pill key={cle} actif={filtre === cle} onClick={() => setFiltre(cle)}>{label}</Pill>
        ))}
        <span className="mx-1 h-5 w-px bg-brun/15" aria-hidden="true" />
        <Pill actif={archives} onClick={() => setArchives((a) => !a)}>Inclure les archivés</Pill>
      </div>

      {error && <p role="alert" className="mt-5 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

      <div className="mt-5 space-y-3">
        {loading ? (
          <p className="rounded-2xl bg-white p-8 text-center text-sm text-brun/50">Chargement…</p>
        ) : visibles.length === 0 ? (
          <p className="rounded-2xl bg-white p-8 text-center text-sm text-brun/50">Aucun fournisseur pour le moment.</p>
        ) : (
          visibles.map((f) => (
            <article key={f.id}
                     className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm ${
                       f.est_archive ? "opacity-70" : ""}`}>
              <div className="min-w-0">
                <h2 className="truncate font-semibold text-brun">{f.nom}</h2>
                <p className="mt-0.5 text-sm text-brun/60">
                  {f.zone_couverte} — capacité {Number(f.capacite_livraison).toLocaleString("fr-FR")}
                </p>
                {f.score_fiabilite != null && (
                  <p className="mt-0.5 text-xs text-brun/50">Fiabilité {f.score_fiabilite} %</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <StatutBadge statut={f.statut} />
                {f.est_archive ? (
                  <span className="text-sm text-brun/60">Archivé le {formatDate(f.date_archivage)}</span>
                ) : (
                  <select aria-label={`Statut de ${f.nom}`} value={f.statut}
                          disabled={busyId === f.id} onChange={(e) => onStatut(f, e.target.value)}
                          className="rounded-lg border border-brun/20 bg-white px-3 py-2 text-sm text-brun focus:border-rouille focus:outline-none focus:ring-2 focus:ring-rouille/25">
                    {STATUTS_MODIFIABLES.map((s) => <option key={s} value={s}>{STATUTS[s].label}</option>)}
                    {f.statut === "INACTIF" && <option value="INACTIF" disabled>{STATUTS.INACTIF.label}</option>}
                  </select>
                )}
                <button onClick={() => setVue({ nom: "historique", fournisseur: f })}
                        className="rounded-lg border border-brun/20 bg-white px-4 py-2 text-sm font-medium text-brun hover:bg-cream">
                  Historique
                </button>
                {!f.est_archive && (
                  <button onClick={() => setAArchiver(f)}
                          className="rounded-lg border border-danger/40 bg-white px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10">
                    Archiver
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </div>

      {aArchiver && (
        <ConfirmArchiveDialog fournisseur={aArchiver} busy={busyId === aArchiver.id}
                              onConfirm={confirmerArchivage} onCancel={() => setAArchiver(null)} />
      )}
    </div>
  );
}

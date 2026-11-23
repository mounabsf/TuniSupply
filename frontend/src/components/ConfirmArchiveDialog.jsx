import { useEffect, useRef } from "react";

export default function ConfirmArchiveDialog({ fournisseur, busy, onConfirm, onCancel }) {
  const cancelRef = useRef(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onCancelRef.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brun/50 p-4" onClick={onCancel}>
      <div role="dialog" aria-modal="true" aria-labelledby="archive-titre"
           onClick={(e) => e.stopPropagation()}
           className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 id="archive-titre" className="font-display text-xl font-bold text-brun">
          Archiver {fournisseur.nom} ?
        </h2>
        <p className="mt-2 text-sm text-brun/70">
          Le fournisseur n'apparaîtra plus dans la liste active et passera au statut inactif.
          Son historique de livraisons est conservé.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button ref={cancelRef} onClick={onCancel}
                  className="rounded-lg border border-brun/20 bg-white px-5 py-2.5 text-sm font-medium text-brun hover:bg-cream">
            Annuler
          </button>
          <button onClick={onConfirm} disabled={busy}
                  className="rounded-lg bg-danger px-5 py-2.5 text-sm font-semibold text-white hover:bg-danger/90 disabled:opacity-60">
            {busy ? "Archivage…" : "Archiver"}
          </button>
        </div>
      </div>
    </div>
  );
}

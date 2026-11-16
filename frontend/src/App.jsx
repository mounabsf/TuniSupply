import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import { modules } from "./modules.js";
import Home from "./pages/Home.jsx";
import ComingSoon from "./pages/ComingSoon.jsx";
import Demandes from "./pages/Demandes.jsx";
import DemandeForm from "./pages/DemandeForm.jsx";
import Regroupement from "./pages/Regroupement.jsx";
import Ressources from "./pages/Ressources.jsx";
import LotForm from "./pages/LotForm.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />

        {/* ===== Module Demandes (Mouna) ===== */}
        <Route path="/demandes" element={<Demandes />} />
        <Route path="/demandes/nouvelle" element={<DemandeForm />} />
        <Route path="/demandes/:id/modifier" element={<DemandeForm />} />
        <Route path="/regroupement" element={<Regroupement />} />

        {/* ===== Module Ressources (Oumaima) ===== */}
        <Route path="/ressources" element={<Ressources />} />
        <Route path="/ressources/nouveau" element={<LotForm />} />
        <Route path="/ressources/:id/modifier" element={<LotForm />} />

        {/* ===== Modules des camarades : page « bientôt » tant que ready = false ===== */}
        {modules
          .filter((m) => !m.ready)
          .map((m) => (
            <Route key={m.key} path={m.base} element={<ComingSoon module={m} />} />
          ))}

        {/* Les camarades ajoutent ici leurs routes, par exemple :
            <Route path="/stocks" element={<Stocks />} />  */}
      </Route>
    </Routes>
  );
}
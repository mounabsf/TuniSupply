import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import { modules } from "./modules.js";
import Home from "./pages/Home.jsx";
import ComingSoon from "./pages/ComingSoon.jsx";
import Demandes from "./pages/Demandes.jsx";
import DemandeForm from "./pages/DemandeForm.jsx";
import Regroupement from "./pages/Regroupement.jsx";
import Anomalies from "./pages/Anomalies.jsx";
import AnomalieForm from "./pages/AnomalieForm.jsx";
import Alertes from "./pages/Alertes.jsx";
import AnomaliesLiees from "./pages/AnomaliesLiees.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Profil from "./pages/Profil.jsx";
import Comptes from "./pages/Comptes.jsx";
import CompteForm from "./pages/CompteForm.jsx";
import RequireAuth from "./auth/RequireAuth.jsx";

export default function App() {
  return (
    <Routes>
      {/* ===== Gestion des comptes : pages publiques ===== */}
      <Route path="/login" element={<Login />} />
      <Route path="/inscription" element={<Register />} />

      {/* Tout le reste exige d'être connecté */}
      <Route element={<RequireAuth />}>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/profil" element={<Profil />} />

        {/* ===== Module Gestion des comptes : administrateurs seulement ===== */}
        <Route element={<RequireAuth roles={["ADMIN"]} />}>
          <Route path="/comptes" element={<Comptes />} />
          <Route path="/comptes/nouveau" element={<CompteForm />} />
          <Route path="/comptes/:id/modifier" element={<CompteForm />} />
        </Route>

        {/* ===== Module Demandes (Mouna) ===== */}
        <Route path="/demandes" element={<Demandes />} />
        <Route path="/demandes/nouvelle" element={<DemandeForm />} />
        <Route path="/demandes/:id/modifier" element={<DemandeForm />} />
        <Route path="/regroupement" element={<Regroupement />} />

        {/* ===== Module Anomalies & alertes ===== */}
        <Route path="/anomalies" element={<Anomalies />} />
        <Route path="/anomalies/nouveau" element={<AnomalieForm />} />
        <Route path="/anomalies/alertes" element={<Alertes />} />
        <Route path="/anomalies/liees" element={<AnomaliesLiees />} />
        <Route path="/anomalies/liees/:id" element={<AnomaliesLiees />} />

        {/* ===== Modules des camarades : page « bientôt » tant que ready = false ===== */}
        {modules
          .filter((m) => !m.ready)
          .map((m) => (
            <Route key={m.key} path={m.base} element={<ComingSoon module={m} />} />
          ))}

        {/* Les camarades ajoutent ici leurs routes, par exemple :
            <Route path="/stocks" element={<Stocks />} />  */}
      </Route>
      </Route>
    </Routes>
  );
}
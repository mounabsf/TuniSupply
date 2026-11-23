import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import { modules } from "./modules.js";
import Home from "./pages/Home.jsx";
import Statistiques from "./pages/Statistiques.jsx";
import ComingSoon from "./pages/ComingSoon.jsx";
import Demandes from "./pages/Demandes.jsx";
import DemandeForm from "./pages/DemandeForm.jsx";
import Regroupement from "./pages/Regroupement.jsx";
import Ressources from "./pages/Ressources.jsx";
import LotForm from "./pages/LotForm.jsx";
import Anomalies from "./pages/Anomalies.jsx";
import AnomalieForm from "./pages/AnomalieForm.jsx";
import Alertes from "./pages/Alertes.jsx";
import AnomaliesLiees from "./pages/AnomaliesLiees.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Profil from "./pages/Profil.jsx";
import Comptes from "./pages/Comptes.jsx";
import CompteForm from "./pages/CompteForm.jsx";
import Operations from "./pages/Operations.jsx";
import OperationForm from "./pages/OperationForm.jsx";
import RequireAuth from "./auth/RequireAuth.jsx";
import Stocks from "./pages/Stocks.jsx";
import StockForm from "./pages/StockForm.jsx";

import InventoryApp from "./pages/InventoryApp.jsx";
import Stock from "./pages/Stock.jsx";
import StockHistorique from "./pages/StockHistorique.jsx";
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
        <Route path="/statistiques" element={<Statistiques />} />
        <Route path="/profil" element={<Profil />} />

        <Route element={<RequireAuth roles={["ADMIN", "COMMERCANT", "INSPECTEUR"]} />}>
          <Route path="/stocks" element={<Stocks />} />
        </Route>
        <Route element={<RequireAuth roles={["ADMIN", "COMMERCANT"]} />}>
          <Route path="/stocks/nouveau" element={<StockForm />} />
          <Route path="/stocks/:id/modifier" element={<StockForm />} />
        </Route>

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

        {/* ===== Module Ressources (Oumaima) ===== */}
        <Route path="/ressources" element={<Ressources />} />
        <Route path="/ressources/nouveau" element={<LotForm />} />
        <Route path="/ressources/:id/modifier" element={<LotForm />} />
        {/* ===== Module Anomalies & alertes ===== */}
        <Route path="/anomalies" element={<Anomalies />} />
        <Route path="/anomalies/nouveau" element={<AnomalieForm />} />
        <Route path="/anomalies/:id/modifier" element={<AnomalieForm />} />
        <Route path="/anomalies/alertes" element={<Alertes />} />
        <Route path="/anomalies/liees" element={<AnomaliesLiees />} />
        <Route path="/anomalies/liees/:id" element={<AnomaliesLiees />} />

        {/* ===== Module Logistique (Firas) ===== */}
        <Route path="/logistique" element={<Operations />} />
        <Route path="/logistique/nouvelle" element={<OperationForm />} />
        <Route path="/logistique/:id/modifier" element={<OperationForm />} />
        <Route path="/anomalies/liees/:id" element={<AnomaliesLiees />} />

{/* ===== Module Stock ===== */}
<Route path="/stock" element={<Stock />} />
<Route path="/stock/nouveau" element={<Stock />} />
<Route path="/stock/historique" element={<StockHistorique />} />
        {/* ===== Modules des camarades : page « bientôt » tant que ready = false ===== */}
        {/* ===== Modules des camarades : page « bientôt » tant que ready = false ===== */}
        {modules
          .filter((m) => !m.ready)
          .map((m) => (
            <Route key={m.key} path={m.base} element={<ComingSoon module={m} />} />
          ))}

      </Route>
      </Route>
    </Routes>
  );
}
import {
  AlertTriangle, Boxes, Brain, ClipboardList, Gauge, Map, MapPinned,
  PlusCircle, ShieldAlert, Sparkles, Truck, Warehouse, Layers, Bell,
  Package, Route, Search, UserCog, UserPlus, Users,
} from "lucide-react";

export const modules = [
  {
    key: "demandes",
    title: "Demandes d'allocation",
    short: "Demandes",
    owner: "Mouna",
    icon: ClipboardList,
    base: "/demandes",
    prefixes: ["/demandes", "/regroupement"],
    ready: true, // ← ton module est prêt
    description: "Les commerçants demandent leurs produits subventionnés.",
    tone: { bg: "bg-emerald-50", text: "text-emerald-600", grad: "from-emerald-500 to-teal-600" },
    actions: [
      { label: "Mes demandes", icon: ClipboardList, to: "/demandes", end: true },
      { label: "Nouvelle demande", icon: PlusCircle, to: "/demandes/nouvelle" },
      { label: "Regroupement par zone", icon: MapPinned, to: "/regroupement" },
    ],
  },
  {
    key: "stocks",
    title: "Stocks des commerces",
    short: "Stocks",
    owner: "Yessin",
    icon: Boxes,
    base: "/stocks",
    prefixes: ["/stocks"],
    ready: false,
    description: "Suivi et contrôle des inventaires des Hanouts.",
    tone: { bg: "bg-sky-50", text: "text-sky-600", grad: "from-sky-500 to-blue-600" },
    actions: [
      { label: "Déclarer un stock", icon: Package },
      { label: "Stocks par région", icon: Boxes },
      { label: "Seuils critiques", icon: Gauge },
      { label: "Affecter les stocks", icon: Layers },
    ],
  },
  {
    key: "anomalies",
    title: "Anomalies & alertes",
    short: "Anomalies",
    owner: "Roua",
    icon: AlertTriangle,
    base: "/anomalies",
    prefixes: ["/anomalies"],
    ready: true,
    description: "Signalements de prix abusifs et de spéculation.",
    tone: { bg: "bg-amber-50", text: "text-amber-600", grad: "from-amber-500 to-orange-600" },
    actions: [
      { label: "Anomalies signalées", icon: AlertTriangle, to: "/anomalies", end: true },
      { label: "Nouveau signalement", icon: PlusCircle, to: "/anomalies/nouveau" },
      { label: "Alertes prioritaires", icon: Bell, to: "/anomalies/alertes" },
      { label: "Anomalies liées", icon: Search, to: "/anomalies/liees" },
    ],
  },
  {
    key: "ressources",
    title: "Centres de distribution",
    short: "Ressources",
    owner: "Oumaima",
    icon: Warehouse,
    base: "/ressources",
    prefixes: ["/ressources"],
    ready: false,
    description: "Réserves stratégiques des dépôts régionaux.",
    tone: { bg: "bg-violet-50", text: "text-violet-600", grad: "from-violet-500 to-purple-600" },
    actions: [
      { label: "Ajouter un lot", icon: PlusCircle },
      { label: "Ressources en temps réel", icon: Warehouse },
      { label: "Alertes de pénurie", icon: Bell },
      { label: "Incohérences de volume", icon: ShieldAlert },
    ],
  },
  {
    key: "logistique",
    title: "Opérations logistiques",
    short: "Logistique",
    owner: "Firas",
    icon: Truck,
    base: "/logistique",
    prefixes: ["/logistique"],
    ready: false,
    description: "Tournées de livraison et risques de transport.",
    tone: { bg: "bg-rose-50", text: "text-rose-600", grad: "from-rose-500 to-pink-600" },
    actions: [
      { label: "Planifier une tournée", icon: Route },
      { label: "Opérations en cours", icon: Truck },
      { label: "Niveau de risque d'une zone", icon: Gauge },
    ],
  },
  {
    key: "intelligence",
    title: "Carte & Intelligence IA",
    short: "Carte & IA",
    owner: "Tout le groupe",
    icon: Brain,
    base: "/intelligence",
    prefixes: ["/intelligence"],
    ready: false,
    description: "Carte interactive et modèles prédictifs.",
    tone: { bg: "bg-teal-50", text: "text-teal-600", grad: "from-teal-500 to-cyan-600" },
    actions: [
      { label: "Carte interactive", icon: Map },
      { label: "Prédiction de pénurie", icon: Brain },
      { label: "Matching demandes / grossistes", icon: Sparkles },
      { label: "Risque de spéculation", icon: ShieldAlert },
    ],
  },
  {
    key: "comptes",
    title: "Gestion des comptes",
    short: "Comptes",
    owner: "Tout le groupe",
    icon: UserCog,
    base: "/comptes",
    prefixes: ["/comptes"],
    ready: true,
    adminOnly: true, // visible et accessible aux administrateurs uniquement
    description: "Création, modification et suppression des comptes utilisateurs.",
    tone: { bg: "bg-slate-100", text: "text-slate-700", grad: "from-slate-600 to-slate-800" },
    actions: [
      { label: "Tous les comptes", icon: Users, to: "/comptes", end: true },
      { label: "Nouveau compte", icon: UserPlus, to: "/comptes/nouveau" },
    ],
  },
];

// Modules affichés dans les menus : « adminOnly » est réservé au rôle ADMIN.
export const visibleModules = (user) =>
  modules.filter((m) => !m.adminOnly || user?.role === "ADMIN");

export const isModuleActive = (m, pathname) =>
  m.prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
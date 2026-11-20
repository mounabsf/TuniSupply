import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { input } from "../ui.js";

export default function PasswordInput({ className = "", ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className={`${input} pr-12 ${className}`} />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        title={visible ? "Masquer" : "Afficher"}
        className="absolute inset-y-0 right-3 text-slate-400 hover:text-slate-600"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

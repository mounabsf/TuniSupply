export default function Erreurs({ messages }) {
  if (!messages?.length) return null;
  return (
    <ul className="mt-4 space-y-1 rounded-xl bg-rose-50 p-3 text-sm text-rose-600" role="alert">
      {messages.map((m) => <li key={m}>{m}</li>)}
    </ul>
  );
}

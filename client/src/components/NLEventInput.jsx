import { useState } from "react";
import { Sparkles } from "lucide-react";
import { parseEvent } from "../api/events.js";

/**
 * Free-text input that calls Gemini via the /api/events/parse endpoint.
 * Calls onParsed(preview) on success, onError(message) on failure.
 */
export default function NLEventInput({ petName, onParsed, onError, disabled }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleParse(e) {
    e.preventDefault();
    if (!text.trim() || loading) return;
    setLoading(true);
    onError("");
    try {
      const preview = await parseEvent(text.trim(), petName);
      onParsed(preview, text.trim());
      setText("");
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleParse} className="flex flex-col gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled || loading}
        placeholder={
          petName
            ? `e.g. "${petName} ate half her food at 7am"`
            : "Describe what happened in plain language…"
        }
        rows={3}
        maxLength={500}
        className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 resize-none focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent disabled:opacity-50"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-stone-400">{text.length}/500</span>
        <button
          type="submit"
          disabled={!text.trim() || loading || disabled}
          className="flex items-center gap-1.5 bg-amber-800 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-amber-900 transition-colors disabled:opacity-40"
        >
          <Sparkles size={14} strokeWidth={2} />
          {loading ? "Parsing…" : "Parse"}
        </button>
      </div>
    </form>
  );
}

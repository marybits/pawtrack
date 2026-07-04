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
        className="w-full rounded-xl border border-stone-200 bg-[#F5F4F7] px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 resize-none focus:outline-none focus:ring-[1.5px] focus:ring-[#3D3170] focus:border-[#3D3170] focus:shadow-[0_0_0_3px_rgba(61,49,112,0.08)] transition-all duration-150 disabled:opacity-50"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-stone-400">{text.length}/500</span>
        <button
          type="submit"
          disabled={!text.trim() || loading || disabled}
          className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-all duration-200 active:scale-[0.97] ${
            text.trim()
              ? "bg-[#3D3170] hover:bg-[#2E2454] text-white shadow-[0_2px_8px_rgba(61,49,112,0.22)]"
              : "bg-transparent border border-stone-200 text-stone-400 cursor-default"
          }`}
        >
          <Sparkles size={14} strokeWidth={2} />
          {loading ? "Parsing…" : "Parse"}
        </button>
      </div>
    </form>
  );
}

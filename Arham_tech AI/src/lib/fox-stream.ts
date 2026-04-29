import type { Message, Settings } from "./fox-storage";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export type StreamMode = "chat" | "website" | "app";

interface StreamArgs {
  messages: { role: "user" | "assistant"; content: string }[];
  mode: StreamMode;
  settings: Settings;
  onDelta: (chunk: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
  signal?: AbortSignal;
}

// Online: Lovable AI Gateway
async function streamOnline(a: StreamArgs) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({
      messages: a.messages,
      mode: a.mode,
      personality: a.settings.personality,
      language: a.settings.language,
      temperature: a.settings.temperature,
      model: a.settings.model,
      length: a.settings.length,
      reasoning: a.settings.reasoning,
      maxTokens: a.settings.maxTokens,
    }),
    signal: a.signal,
  });

  if (!resp.ok || !resp.body) {
    let err = `HTTP ${resp.status}`;
    try { const j = await resp.json(); err = j.error || err; } catch {}
    a.onError(err);
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let done = false;
  while (!done) {
    const { done: d, value } = await reader.read();
    if (d) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const j = line.slice(6).trim();
      if (j === "[DONE]") { done = true; break; }
      try {
        const p = JSON.parse(j);
        const c = p.choices?.[0]?.delta?.content;
        if (c) a.onDelta(c);
      } catch { buf = line + "\n" + buf; break; }
    }
  }
  a.onDone();
}

// Offline: Ollama
async function streamOllama(a: StreamArgs) {
  try {
    const sysMap: Record<string, string> = {
      friendly: "You are FOX, friendly helpful AI.",
      developer: "You are FOX in Developer Mode. Concise expert technical answers with code.",
      teacher: "You are FOX the Teacher. Explain step-by-step.",
      creative: "You are FOX the Creative Writer.",
      assistant: "You are FOX, productive assistant.",
    };
    let sys = sysMap[a.settings.personality];
    if (a.mode === "website") sys = "Output ONLY a single complete index.html in one ```html code block. Modern responsive design.";
    if (a.mode === "app") sys = "Output ONLY a single complete index.html mini-app in one ```html code block. Modern responsive.";

    const resp = await fetch(`${a.settings.ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: a.settings.ollamaModel,
        messages: [{ role: "system", content: sys }, ...a.messages],
        stream: true,
      }),
      signal: a.signal,
    });
    if (!resp.ok || !resp.body) { a.onError(`Ollama: HTTP ${resp.status}. Kya ${a.settings.ollamaUrl} chal raha hai?`); return; }
    const reader = resp.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        try { const p = JSON.parse(line); if (p.message?.content) a.onDelta(p.message.content); } catch {}
      }
    }
    a.onDone();
  } catch (e) {
    a.onError(`Ollama connect fail. ${a.settings.ollamaUrl} chalu hai? (${e instanceof Error ? e.message : "err"})`);
  }
}

export async function streamChat(a: StreamArgs) {
  if (a.settings.offlineMode) return streamOllama(a);
  return streamOnline(a);
}

export function extractHtml(text: string): string | null {
  // Find ```html block (open or closed)
  const m = text.match(/```html\s*\n([\s\S]*?)(?:```|$)/i);
  if (m && m[1].trim()) return m[1].trim();
  // Or full <!DOCTYPE>
  const dm = text.match(/<!DOCTYPE[\s\S]*?<\/html>/i);
  if (dm) return dm[0];
  // Partial during streaming
  if (text.includes("<!DOCTYPE") || text.includes("<html")) {
    const idx = text.search(/<!DOCTYPE|<html/i);
    return text.slice(idx);
  }
  return null;
}

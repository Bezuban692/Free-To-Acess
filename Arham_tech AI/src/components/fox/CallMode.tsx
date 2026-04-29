import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, PhoneOff, Volume2 } from "lucide-react";
import { streamChat } from "@/lib/fox-stream";
import type { Settings } from "@/lib/fox-storage";

interface Props { open: boolean; onClose: () => void; settings: Settings; }

export function CallMode({ open, onClose, settings }: Props) {
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const recRef = useRef<any>(null);
  const history = useRef<{ role: "user" | "assistant"; content: string }[]>([]);

  useEffect(() => { if (!open) { stopAll(); } }, [open]);

  const stopAll = () => {
    try { recRef.current?.stop?.(); } catch {}
    window.speechSynthesis?.cancel?.();
    setListening(false);
    setThinking(false);
  };

  const speak = (text: string) => new Promise<void>((res) => {
    if (!("speechSynthesis" in window)) return res();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = settings.language === "ur" ? "ur-PK" : settings.language === "roman" ? "en-IN" : "en-US";
    u.onend = () => res();
    u.onerror = () => res();
    window.speechSynthesis.speak(u);
  });

  const respond = async (userText: string) => {
    history.current.push({ role: "user", content: userText });
    setReply("");
    setThinking(true);
    let acc = "";
    await streamChat({
      messages: history.current,
      mode: "chat",
      settings: { ...settings, model: settings.model },
      onDelta: (c) => { acc += c; setReply(acc); },
      onDone: async () => {
        setThinking(false);
        history.current.push({ role: "assistant", content: acc });
        await speak(acc.replace(/```[\s\S]*?```/g, " (code) ").slice(0, 500));
        startListen();
      },
      onError: (e) => { setThinking(false); setReply("Error: " + e); },
    });
  };

  const startListen = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setReply("Speech recognition not supported in this browser."); return; }
    const rec = new SR();
    rec.lang = settings.language === "ur" ? "ur-PK" : "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      let t = ""; for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript;
      setTranscript(t);
      if (e.results[e.results.length - 1].isFinal && t.trim()) {
        setListening(false);
        respond(t.trim());
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setTranscript("");
    setListening(true);
    rec.start();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] gradient-hero flex flex-col items-center justify-center text-white p-6 animate-fade-in">
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative flex flex-col items-center gap-8 max-w-md w-full">
        <div className="relative">
          <div className={`w-44 h-44 rounded-full gradient-bg flex items-center justify-center text-7xl shadow-2xl ${listening || thinking ? "animate-pulse-glow" : ""}`}>🦊</div>
          {(listening || thinking) && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex gap-1 items-end h-20">
                {[0,1,2,3,4,5,6].map(i => (
                  <div key={i} className="w-2 bg-white/80 rounded-full" style={{ height: "100%", animation: `wave 0.8s ease-in-out ${i * 0.1}s infinite` }} />
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="text-center space-y-2 min-h-[120px]">
          <p className="text-xs uppercase tracking-widest opacity-70">{thinking ? "FOX is thinking..." : listening ? "Listening..." : "Tap mic to speak"}</p>
          {transcript && <p className="text-lg font-medium">"{transcript}"</p>}
          {reply && <p className="text-sm opacity-90 max-h-32 overflow-auto scroll-thin">{reply}</p>}
        </div>
        <div className="flex gap-4">
          <Button size="lg" onClick={listening ? () => recRef.current?.stop() : startListen} className="rounded-full w-16 h-16 p-0 bg-white text-foreground hover:bg-white/90">
            {listening ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
          </Button>
          <Button size="lg" variant="destructive" onClick={() => { stopAll(); onClose(); }} className="rounded-full w-16 h-16 p-0">
            <PhoneOff className="w-7 h-7" />
          </Button>
        </div>
        <p className="text-xs opacity-60 flex items-center gap-1"><Volume2 className="w-3 h-3" />Voice • {settings.language === "auto" ? "auto-lang" : settings.language}</p>
      </div>
    </div>
  );
}

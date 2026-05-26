import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { askDoctor } from "@/lib/doctor.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Stethoscope, Send, Loader2 } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "How did the 1918 Spanish Flu spread and end?",
  "Why did COVID-19 become a global pandemic?",
  "What is ring vaccination and when does it work?",
  "How is Ebola controlled in a community?",
];

export default function AIDoctor() {
  const ask = useServerFn(askDoctor);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hello. I'm the SENTINEL AI Doctor. Ask me anything about past pandemics, how diseases spread, or how outbreaks are contained. I'll answer in simple words." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [messages, busy]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const { reply } = await ask({ data: { messages: next.map(m => ({ role: m.role, content: m.content })) } });
      setMessages([...next, { role: "assistant", content: reply || "(no response)" }]);
    } catch (e: any) {
      setMessages([...next, { role: "assistant", content: `Sorry — ${e.message || "something went wrong."}` }]);
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  return (
    <div className="sentinel-card flex flex-col h-[70vh]">
      <div className="flex items-center gap-2 pb-3 border-b border-border">
        <div className="w-9 h-9 rounded-lg bg-teal/10 border border-teal-border flex items-center justify-center">
          <Stethoscope className="w-4 h-4 text-teal" />
        </div>
        <div>
          <div className="font-display">AI Doctor</div>
          <div className="text-[10px] font-mono text-muted-foreground tracking-widest">PANDEMIC KNOWLEDGE ASSISTANT</div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
            <div className={m.role === "user"
              ? "max-w-[80%] bg-teal text-[#001012] px-4 py-2.5 rounded-2xl rounded-br-sm"
              : "max-w-[85%] text-foreground whitespace-pre-wrap leading-relaxed"}>
              {m.content}
            </div>
          </div>
        ))}
        {busy && <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" />Thinking...</div>}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {STARTERS.map(s => (
              <button key={s} onClick={() => send(s)} className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-teal-border hover:bg-teal/5 transition">
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2 pt-3 border-t border-border">
        <Input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about any pandemic, virus, or containment strategy..." disabled={busy} className="flex-1" />
        <Button type="submit" disabled={busy || !input.trim()} className="bg-teal text-[#001012] hover:bg-teal/90">
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}

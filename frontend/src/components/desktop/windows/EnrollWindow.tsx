import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Window } from "../Window";
import { api } from "@/lib/api";

export function EnrollWindow() {
  const [picked, setPicked] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [subjects, setSubjects] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    api
      .getContent("subjects")
      .then((r) => {
        if (!mounted) return;
        setSubjects((r?.data || []) as string[]);
      })
      .catch(() => {
        if (!mounted) return;
        setSubjects([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const toggle = (s: string) =>
    setPicked((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const payload = {
      name: String(fd.get("name") || ""),
      email: String(fd.get("email") || ""),
      phone: String(fd.get("phone") || ""),
      level: String(fd.get("level") || ""),
      subjects: picked,
      format: String(fd.get("format") || ""),
      message: String(fd.get("message") || ""),
    };

    try {
      await api.enroll(payload);
      toast.success("CONNECTION ESTABLISHED", {
        description: "Request transmitted. We'll respond within 24h.",
      });
      form.reset();
      setPicked([]);
    } catch (err: any) {
      toast.error("TRANSMISSION FAILED", {
        description: err?.message || "unknown_error",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <Window id="enroll">
      <div className="p-6 max-w-xl mx-auto">
        <div className="font-mono text-xs uppercase tracking-[0.3em] text-primary text-glow mb-1">
          // secure_channel
        </div>
        <h2 className="font-mono text-2xl mb-1">Enroll / Get in touch</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Tell us about the student. Free 20-min diagnostic call, no obligation.
        </p>

        <form onSubmit={onSubmit} className="space-y-4 font-mono text-xs">
          <Field label="Name" name="name" required />
          <Field label="Email" name="email" type="email" required />
          <Field label="Phone (optional)" name="phone" type="tel" />
          <Select label="Student level" name="level" options={["Primary", "Secondary", "A-Level / IB", "University", "Adult learner"]} />

          <div>
            <label className="block uppercase tracking-widest text-muted-foreground mb-2">Subjects of interest</label>
            <div className="flex flex-wrap gap-1.5">
              {subjects.map((s) => {
                const on = picked.includes(s);
                return (
                  <button
                    type="button"
                    key={s}
                    onClick={() => toggle(s)}
                    className={`px-2.5 py-1 border uppercase tracking-wider transition-colors ${
                      on
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-foreground/80 hover:border-primary hover:text-primary"
                    }`}
                  >
                    {on ? "▸ " : ""}{s}
                  </button>
                );
              })}
            </div>
          </div>

          <Select label="Preferred format" name="format" options={["1-on-1 online", "1-on-1 in-person", "Small group online", "Not sure yet"]} />

          <div>
            <label className="block uppercase tracking-widest text-muted-foreground mb-1.5">Message</label>
            <textarea
              name="message"
              rows={4}
              placeholder="Goals, current challenges, deadlines..."
              className="w-full bg-input/50 border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            disabled={sending}
            className="w-full py-3 bg-primary text-primary-foreground uppercase tracking-[0.3em] hover:bg-amber-glow transition-colors disabled:opacity-60 window-shadow"
          >
            {sending ? "▸ transmitting..." : "▸ transmit request"}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-border grid grid-cols-3 gap-3 font-mono text-[11px]">
          <div>
            <div className="text-muted-foreground uppercase tracking-widest text-[9px] mb-1">Email</div>
            <div className="text-primary">hello@edunexuz.io</div>
          </div>
          <div>
            <div className="text-muted-foreground uppercase tracking-widest text-[9px] mb-1">Phone</div>
            <div className="text-foreground">+44 20 4538 1102</div>
          </div>
          <div>
            <div className="text-muted-foreground uppercase tracking-widest text-[9px] mb-1">HQ</div>
            <div className="text-foreground">London / Berlin</div>
          </div>
        </div>
      </div>
    </Window>
  );
}

function Field({ label, name, type = "text", required }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label htmlFor={name} className="block uppercase tracking-widest text-muted-foreground mb-1.5">
        {label}{required && <span className="text-primary"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        className="w-full bg-input/50 border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      />
    </div>
  );
}

function Select({ label, name, options }: { label: string; name: string; options: string[] }) {
  return (
    <div>
      <label htmlFor={name} className="block uppercase tracking-widest text-muted-foreground mb-1.5">{label}</label>
      <select
        id={name}
        name={name}
        className="w-full bg-input/50 border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      >
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

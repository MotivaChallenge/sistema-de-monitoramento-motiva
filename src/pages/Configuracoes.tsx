import { useEffect, useState } from "react";
import { TopHeader } from "@/components/vegia/TopHeader";
import { ConfirmationDialog } from "@/components/vegia/ConfirmationDialog";
import { logAudit, diffForAudit } from "@/lib/audit";
import { useSettings, DEFAULT_SETTINGS, UserSettings, validateSettings } from "@/hooks/useSettings";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, RotateCcw, User as UserIcon, Sliders, Bell, Palette } from "lucide-react";

const Section = ({ icon: Icon, title, desc, children }: { icon: any; title: string; desc?: string; children: React.ReactNode }) => (
  <section className="bg-surface-lowest rounded-xl p-6">
    <div className="flex items-start gap-3 mb-5">
      <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary-glow flex items-center justify-center shrink-0">
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div>
        <h2 className="text-[15px] font-semibold tracking-wide uppercase">{title}</h2>
        {desc && <p className="text-[12px] text-muted-foreground mt-0.5">{desc}</p>}
      </div>
    </div>
    <div className="space-y-4">{children}</div>
  </section>
);

const Field = ({ label, hint, children, htmlFor }: { label: string; hint?: string; children: React.ReactNode; htmlFor?: string }) => (
  <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3 md:items-center">
    <div>
      <label htmlFor={htmlFor} className="text-[13px] font-medium block">{label}</label>
      {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
    <div>{children}</div>
  </div>
);

const NumberInput = ({ id, value, onChange, min, max, suffix, invalid }: { id: string; value: number; onChange: (n: number) => void; min: number; max: number; suffix?: string; invalid?: boolean }) => (
  <div className="flex items-center gap-2">
    <input
      id={id}
      type="number"
      min={min}
      max={max}
      value={Number.isFinite(value) ? value : ""}
      aria-invalid={invalid || undefined}
      onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
      className={`h-10 w-full px-3 rounded-lg bg-surface-high border text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        invalid ? "border-destructive" : "border-border"
      }`}
    />
    {suffix && <span className="text-[12px] text-muted-foreground whitespace-nowrap">{suffix}</span>}
  </div>
);

const SwitchField = ({ id, label, hint, checked, onChange }: { id: string; label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <Field label={label} hint={hint} htmlFor={id}>
    <div className="flex items-center gap-3">
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        aria-label={label}
        className="focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
      />
      <span className={`text-[12px] font-semibold ${checked ? "text-primary" : "text-muted-foreground"}`} aria-hidden>
        {checked ? "Ligado" : "Desligado"}
      </span>
    </div>
  </Field>
);

const Configuracoes = () => {
  const { user } = useAuth();
  const { settings, loading, saving, save } = useSettings();
  const [draft, setDraft] = useState<UserSettings>(settings);
  const [displayName, setDisplayName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);

  useEffect(() => { setDraft(settings); }, [settings]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      setDisplayName(data?.display_name ?? user.email?.split("@")[0] ?? "");
    });
  }, [user]);

  const ircSum = draft.irc_weight_ndvi + draft.irc_weight_altura + draft.irc_weight_idade + draft.irc_weight_chuva;
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);
  const validationError = validateSettings(draft);
  const invalidNum = (v: number) => !Number.isFinite(v) || v < 0;

  const onSave = async () => {
    if (validationError) {
      toast.error("Revise as configurações", { description: validationError });
      return;
    }
    const { error } = await save(draft);
    if (error) toast.error("Não foi possível salvar", { description: error });
    else toast.success("Configurações salvas");
  };

  const onRestoreDefaults = () => {
    if (window.confirm("Restaurar todas as configurações para o padrão? As alterações não salvas serão perdidas.")) {
      setDraft(DEFAULT_SETTINGS);
      toast.info("Padrões restaurados", { description: "Clique em Salvar alterações para confirmar." });
    }
  };

  const onSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").upsert({ user_id: user.id, display_name: displayName }, { onConflict: "user_id" });
    setSavingProfile(false);
    if (error) toast.error("Erro ao salvar perfil", { description: error.message });
    else toast.success("Perfil atualizado");
  };

  return (
    <>
      <TopHeader breadcrumb={[{ label: "Rodoanel SP-021", to: "/dashboard" }]} current="Configurações" />
      <div className="px-10 pb-12 max-w-5xl">
        <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-[34px] font-bold tracking-tight">Configurações</h1>
            <p className="text-muted-foreground mt-1">Personalize sua experiência e ajuste os parâmetros operacionais do sistema.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRestoreDefaults}
              className="h-10 px-4 rounded-lg border border-border text-[12px] font-semibold uppercase tracking-wider inline-flex items-center gap-2 hover:bg-surface-high focus-visible:ring-2 focus-visible:ring-primary/40 outline-none"
            >
              <RotateCcw className="h-4 w-4" /> Restaurar padrão
            </button>
            <button
              onClick={onSave}
              disabled={!dirty || saving || !!validationError}
              title={validationError ?? undefined}
              className="h-10 px-5 rounded-lg bg-gradient-to-b from-primary to-primary-glow text-primary-foreground text-[12px] font-semibold uppercase tracking-wider inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary/40 outline-none"
            >
              <Save className="h-4 w-4" /> {saving ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>
        </div>

        {validationError && !loading && (
          <div role="alert" className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-[12.5px] text-destructive font-medium">
            {validationError}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        ) : (
          <div className="space-y-5">
            <Section icon={UserIcon} title="Perfil" desc="Como você aparece no sistema.">
              <Field label="Nome de exibição" htmlFor="displayName">
                <input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="h-10 w-full px-3 rounded-lg bg-surface-high border border-border text-[13px] outline-none focus:ring-2 focus:ring-primary/40"
                />
              </Field>
              <Field label="E-mail" hint="Não pode ser alterado aqui.">
                <input value={user?.email ?? ""} disabled className="h-10 w-full px-3 rounded-lg bg-surface-low border border-border text-[13px] text-muted-foreground" />
              </Field>
              <div className="flex justify-end">
                <button
                  onClick={onSaveProfile}
                  disabled={savingProfile}
                  className="h-9 px-4 rounded-lg border border-border text-[12px] font-semibold inline-flex items-center gap-2 hover:bg-surface-high disabled:opacity-40"
                >
                  {savingProfile ? "Salvando…" : "Atualizar perfil"}
                </button>
              </div>
            </Section>

            <Section icon={Palette} title="Aparência" desc="Tema e densidade da interface.">
              <Field label="Tema">
                <div className="flex gap-2">
                  {(["dark", "light"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setDraft({ ...draft, theme: t })}
                      className={`flex-1 h-10 rounded-lg border text-[12px] font-semibold uppercase tracking-wider ${
                        draft.theme === t ? "bg-primary/15 border-primary text-primary-glow" : "bg-surface-high border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t === "dark" ? "Escuro" : "Claro"}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Densidade" hint="Compacto reduz espaçamentos para telas menores.">
                <div className="flex gap-2">
                  {(["comfortable", "compact"] as const).map(d => (
                    <button
                      key={d}
                      onClick={() => setDraft({ ...draft, density: d })}
                      className={`flex-1 h-10 rounded-lg border text-[12px] font-semibold uppercase tracking-wider ${
                        draft.density === d ? "bg-primary/15 border-primary text-primary-glow" : "bg-surface-high border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {d === "comfortable" ? "Confortável" : "Compacto"}
                    </button>
                  ))}
                </div>
              </Field>
            </Section>

            <Section icon={Sliders} title="Pesos do IRC" desc={`Como o Índice de Risco de Crescimento é calculado. Os 4 pesos devem somar 100. Atualmente: ${ircSum}.`}>
              <Field label="NDVI (cobertura vegetal)" htmlFor="w1" hint="Quanto maior, mais peso para o índice de vegetação.">
                <NumberInput id="w1" invalid={invalidNum(draft.irc_weight_ndvi)} value={draft.irc_weight_ndvi} min={0} max={100} suffix="%" onChange={n => setDraft({ ...draft, irc_weight_ndvi: n })} />
              </Field>
              <Field label="Altura vs. limite contratual" htmlFor="w2">
                <NumberInput id="w2" invalid={invalidNum(draft.irc_weight_altura)} value={draft.irc_weight_altura} min={0} max={100} suffix="%" onChange={n => setDraft({ ...draft, irc_weight_altura: n })} />
              </Field>
              <Field label="Dias desde a última roçada" htmlFor="w3">
                <NumberInput id="w3" invalid={invalidNum(draft.irc_weight_idade)} value={draft.irc_weight_idade} min={0} max={100} suffix="%" onChange={n => setDraft({ ...draft, irc_weight_idade: n })} />
              </Field>
              <Field label="Chuva acumulada (5 dias)" htmlFor="w4">
                <NumberInput id="w4" invalid={invalidNum(draft.irc_weight_chuva)} value={draft.irc_weight_chuva} min={0} max={100} suffix="%" onChange={n => setDraft({ ...draft, irc_weight_chuva: n })} />
              </Field>
              <div className={`text-[12px] font-semibold mt-2 ${ircSum === 100 ? "text-primary" : "text-destructive"}`}>
                Soma dos pesos: {ircSum}/100 {ircSum === 100 ? "✓" : "(ajuste para 100 antes de salvar)"}
              </div>
            </Section>

            <Section icon={Sliders} title="Limiares de altura" desc="Define quando um trecho entra em atenção ou estado crítico.">
              <Field label="Altura de atenção" htmlFor="ha" hint="A partir desta altura o trecho recebe alerta amarelo.">
                <NumberInput id="ha" invalid={invalidNum(draft.altura_atencao_cm)} value={draft.altura_atencao_cm} min={1} max={200} suffix="cm" onChange={n => setDraft({ ...draft, altura_atencao_cm: n })} />
              </Field>
              <Field label="Altura crítica" htmlFor="hc" hint="Deve ser maior ou igual à altura de atenção.">
                <NumberInput id="hc" invalid={invalidNum(draft.altura_critica_cm) || draft.altura_critica_cm < draft.altura_atencao_cm} value={draft.altura_critica_cm} min={1} max={300} suffix="cm" onChange={n => setDraft({ ...draft, altura_critica_cm: n })} />
              </Field>
            </Section>

            <Section icon={Bell} title="Notificações" desc="Escolha quando e como ser avisado.">
              <SwitchField
                id="notify-critico"
                label="Alertas de trechos críticos"
                hint="Avisos para vegetação acima do limite contratual."
                checked={draft.notify_critico}
                onChange={v => setDraft({ ...draft, notify_critico: v })}
              />
              <SwitchField
                id="notify-atencao"
                label="Alertas de trechos em atenção"
                hint="Avisos preventivos antes de o trecho ficar crítico."
                checked={draft.notify_atencao}
                onChange={v => setDraft({ ...draft, notify_atencao: v })}
              />
            </Section>
          </div>
        )}
      </div>
    </>
  );
};

export default Configuracoes;

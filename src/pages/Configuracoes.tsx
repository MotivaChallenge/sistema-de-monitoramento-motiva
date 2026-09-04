import { useEffect, useState } from "react";
import { TopHeader } from "@/components/vegia/TopHeader";
import { ConfirmationDialog } from "@/components/vegia/ConfirmationDialog";
import { logAudit, diffForAudit } from "@/lib/audit";
import type { Json } from "@/integrations/supabase/types";
import { useSettings, DEFAULT_SETTINGS, UserSettings, validateSettings } from "@/hooks/useSettings";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, RotateCcw, User as UserIcon, Sliders, Bell, Palette, History } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { settingsVersionLabel } from "@/lib/settings-version";

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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState("");

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

  /** Campos numéricos de cálculo que alteram classificação/priorização retroativamente. */
  const CALC_KEYS: (keyof UserSettings)[] = [
    "irc_weight_ndvi", "irc_weight_altura", "irc_weight_idade", "irc_weight_chuva",
    "altura_atencao_cm", "altura_critica_cm",
  ];
  const changedKeys = (Object.keys(draft) as (keyof UserSettings)[]).filter(k => draft[k] !== settings[k]);
  const calcChanged = changedKeys.filter(k => CALC_KEYS.includes(k));

  const onSave = () => {
    if (validationError) {
      toast.error("Revise as configurações", { description: validationError });
      return;
    }
    setConfirmOpen(true);
  };

  const confirmSave = async () => {
    setConfirmOpen(false);
    const before = { ...settings };
    const { error } = await save(draft);
    if (error) {
      toast.error("Não foi possível salvar", { description: error });
      return;
    }
    toast.success("Configurações salvas");
    const diff = diffForAudit(
      before as unknown as Record<string, Json | undefined>,
      draft as unknown as Record<string, Json | undefined>
    );
    logAudit({
      action: "settings.update",
      entity: "user_settings",
      entityId: user?.id ?? null,
      before: diff ? { from: before as unknown as Json } : null,
      after: diff ? { to: draft as unknown as Json } : null,
      reason: reason.trim() || "Alteração de configurações operacionais",
    });
    setReason("");
  };

  const onRestoreDefaults = () => setRestoreOpen(true);
  const confirmRestoreDefaults = () => {
    const before = { ...settings };
    setDraft(DEFAULT_SETTINGS);
    setRestoreOpen(false);
    toast.info("Padrões restaurados", { description: "Clique em Salvar alterações para confirmar." });
    logAudit({
      action: "settings.restore_defaults",
      entity: "user_settings",
      entityId: user?.id ?? null,
      before,
      after: { ...DEFAULT_SETTINGS },
      reason: "Restauração para valores de fábrica",
    });
  };

  const onSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const before = displayName;
    const { data: current, error: fetchError } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
    if (fetchError) {
      setSavingProfile(false);
      toast.error("Erro ao buscar perfil", { description: fetchError.message });
      return;
    }
    const { error } = await supabase.from("profiles").upsert({ user_id: user.id, display_name: displayName }, { onConflict: "user_id" });
    setSavingProfile(false);
    if (error) {
      toast.error("Erro ao salvar perfil", { description: error.message });
      return;
    }
    toast.success("Perfil atualizado");
    logAudit({
      action: "profile.update",
      entity: "profiles",
      entityId: user.id,
      before: { display_name: current?.display_name ?? null },
      after: { display_name: displayName },
      reason: "Atualização de nome de exibição",
    });
  };

  return (
    <>
      <TopHeader breadcrumb={[{ label: "Rodoanel SP-021", to: "/dashboard" }]} current="Configurações" />
      <div className="px-10 pb-12 max-w-5xl">
        <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-[34px] font-bold tracking-tight">Configurações</h1>
            <p className="text-muted-foreground mt-1">Personalize sua experiência e ajuste os parâmetros operacionais do sistema.</p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground bg-surface-low border border-border/50 rounded-md px-2 py-1">
              <History className="h-3 w-3" /> Versão do cálculo em uso: {settingsVersionLabel(settings)}
            </p>
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
              <SwitchField
                id="notify-email"
                label="Resumo por e-mail"
                hint={`Enviar resumo diário para ${user?.email ?? "seu e-mail"}.`}
                checked={draft.notify_email}
                onChange={v => setDraft({ ...draft, notify_email: v })}
              />
            </Section>

          </div>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirmar alteração de parâmetros</DialogTitle>
            <DialogDescription>
              Revise o impacto antes de salvar. A alteração fica registrada com data, hora, usuário, valor anterior e novo valor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-[13px]">
            {calcChanged.length > 0 ? (
              <div className="rounded-lg border border-tertiary/40 bg-tertiary/10 px-3 py-2 text-tertiary">
                <b>Impacto:</b> {calcChanged.length} parâmetro(s) de cálculo mudam. Trechos serão reclassificados e prioridades recalculadas
                imediatamente em dashboard, mapa, planejamento e previsões. Relatórios históricos permanecem identificados pela versão anterior dos parâmetros.
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-surface-low px-3 py-2 text-muted-foreground">
                Apenas preferências de interface/notificação — sem impacto na classificação dos trechos.
              </div>
            )}
            <div className="grid grid-cols-1 gap-1 font-mono text-[11.5px]">
              <div><span className="text-muted-foreground">Versão atual:&nbsp;</span>{settingsVersionLabel(settings)}</div>
              <div><span className="text-muted-foreground">Nova versão:&nbsp;&nbsp;</span>{settingsVersionLabel(draft)}</div>
            </div>
            <ul className="max-h-40 overflow-y-auto space-y-1 text-[12px]">
              {changedKeys.map(k => (
                <li key={k} className="flex justify-between gap-3 border-b border-border/40 pb-1">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="tabular-nums"><s className="opacity-60">{String(settings[k])}</s> → <b>{String(draft[k])}</b></span>
                </li>
              ))}
            </ul>
            <div>
              <label htmlFor="settings-reason" className="text-[11px] uppercase tracking-wider text-muted-foreground">Motivo da alteração (opcional)</label>
              <Textarea id="settings-reason" value={reason} onChange={e => setReason(e.target.value)} placeholder="Ex.: ajuste após calibração de campo do trecho KM 12" className="mt-1 min-h-[70px] text-[13px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={confirmSave} disabled={saving}>{saving ? "Salvando…" : "Confirmar e salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
        title="Restaurar configurações padrão"
        description="Todas as personalizações de pesos IRC, limiares de altura e notificações serão resetadas para os valores de fábrica. Alterações não salvas serão perdidas."
        impact="Regras de criticidade voltarão ao comportamento inicial do sistema."
        confirmLabel="Restaurar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={confirmRestoreDefaults}
      />
    </>
  );
};

export default Configuracoes;

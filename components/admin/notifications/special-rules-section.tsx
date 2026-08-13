"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { RecipientConfigDraft } from "@/lib/notification-recipient-config";
import { special_rule_label } from "@/lib/notification-recipient-config";

type SpecialRulesSectionProps = {
  available_rules: string[];
  draft: RecipientConfigDraft;
  on_draft_change: (next: RecipientConfigDraft) => void;
};

export function SpecialRulesSection({
  available_rules,
  draft,
  on_draft_change,
}: SpecialRulesSectionProps) {
  if (available_rules.length === 0) {
    return (
      <section className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
        Este evento no tiene reglas especiales configurables.
      </section>
    );
  }

  const toggle_boolean_rule = (key: string) => {
    const next_rules = { ...draft.special_rules };
    if (next_rules[key] === true) delete next_rules[key];
    else next_rules[key] = true;
    on_draft_change({ ...draft, special_rules: next_rules });
  };

  const set_broadcast_app = (value: string) => {
    on_draft_change({
      ...draft,
      special_rules: {
        ...draft.special_rules,
        broadcast_app_members: value.trim() || undefined,
      },
    });
  };

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Casos especiales</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Destinatarios que no se resuelven solo por rol, departamento o permiso.
        </p>
      </div>

      <div className="space-y-3">
        {available_rules.map((rule_key) => {
          if (rule_key === "broadcast_app_members") {
            const value =
              typeof draft.special_rules.broadcast_app_members === "string"
                ? draft.special_rules.broadcast_app_members
                : "";
            return (
              <div
                key={rule_key}
                className="rounded-lg border border-border/80 bg-card p-4 space-y-2"
              >
                <Label htmlFor={`rule-${rule_key}`}>
                  {special_rule_label(rule_key)}
                </Label>
                <Input
                  id={`rule-${rule_key}`}
                  value={value}
                  onChange={(event) => set_broadcast_app(event.target.value)}
                  placeholder="slug de app (ej. scapacitacion, sadministracion)"
                />
                <p className="text-xs text-muted-foreground">
                  Deja vacío para desactivar el broadcast por membresía de app.
                </p>
              </div>
            );
          }

          const checked = draft.special_rules[rule_key] === true;
          return (
            <label
              key={rule_key}
              className="flex items-center gap-3 rounded-lg border border-border/80 bg-card px-4 py-3 cursor-pointer"
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() => toggle_boolean_rule(rule_key)}
              />
              <span className="text-sm">{special_rule_label(rule_key)}</span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

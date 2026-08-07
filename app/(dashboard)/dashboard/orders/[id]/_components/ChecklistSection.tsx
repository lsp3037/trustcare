'use client';
import React, { useState } from 'react';
import { CheckCircle2, ChevronDown, Check } from 'lucide-react';
import { Button, Card, Textarea } from '@/components/ui';
import { cn } from '@/lib/utils';
import { ChecklistTemplateItem, OrderChecklist, ChecklistItem } from './types';

/**
 * Entrada e Saída são fases distintas, então precisam ser distinguíveis
 * quando aparecem lado a lado — mas por token semântico, não por uma
 * família de cor nova (antes: emerald vs sky).
 */
type Phase = 'entry' | 'exit';

const PHASE = {
  entry: {
    accent: 'text-brand',
    dot: 'bg-brand',
    toggleOn: 'bg-brand/20 border-brand',
    knobOn: 'bg-brand',
  },
  exit: {
    accent: 'text-info',
    dot: 'bg-info',
    toggleOn: 'bg-info/20 border-info',
    knobOn: 'bg-info',
  },
} as const satisfies Record<Phase, Record<string, string>>;

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  phase: Phase;
  label: string;
}

/** Toggle pill com cantos arredondados — segue DESIGN_SYSTEM (rounded-full para controles). */
function Toggle({ checked, onChange, disabled = false, phase, label }: ToggleProps) {
  const tone = PHASE[phase];
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border p-0.5',
        'transition-colors duration-200 ease-in-out',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        checked ? tone.toggleOn : 'bg-surface-sunken border-border hover:border-border-strong',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-full w-4 rounded-full transform transition-transform duration-200 ease-in-out',
          checked ? `translate-x-5 ${tone.knobOn}` : 'translate-x-0 bg-border-strong',
        )}
      />
    </button>
  );
}

interface ChecklistItemRowProps {
  label: string;
  field: string;
  checklist: OrderChecklist;
  setChecklist: React.Dispatch<React.SetStateAction<OrderChecklist>>;
  disabled?: boolean;
  phase?: Phase;
}

const EMPTY_ITEM: ChecklistItem = { checked: false, observation: '' };

function ChecklistItemRow({
  label,
  field,
  checklist,
  setChecklist,
  disabled = false,
  phase = 'entry',
}: ChecklistItemRowProps) {
  const item = (checklist[field] || EMPTY_ITEM) as ChecklistItem;

  return (
    <div
      className={cn(
        'rounded-xl px-3 py-3 -mx-3 transition-colors duration-150',
        'hover:bg-surface-sunken',
        item.checked && 'bg-surface-sunken',
      )}
    >
      <div className="grid grid-cols-[1fr_auto] gap-4 items-center">
        <span className="text-small text-text-muted pr-2 break-words">{label}</span>
        <Toggle
          checked={item.checked}
          disabled={disabled}
          phase={phase}
          label={label}
          onChange={() => setChecklist(prev => ({
            ...prev,
            [field]: { ...(prev[field] || EMPTY_ITEM), checked: !(prev[field] || EMPTY_ITEM).checked }
          }))}
        />
      </div>
      {(item.checked || item.observation.trim() !== '') && (
        <input
          type="text"
          disabled={disabled}
          aria-label={`Nota sobre ${label}`}
          placeholder={`Nota: ${label.toLowerCase()}`}
          value={item.observation}
          onChange={(e) => setChecklist(prev => ({
            ...prev,
            [field]: { ...(prev[field] || EMPTY_ITEM), observation: e.target.value }
          }))}
          className="w-full mt-2 bg-transparent border-b border-border focus:border-brand px-1 py-1 text-small text-text placeholder:text-text-subtle focus:outline-none transition-colors"
        />
      )}
    </div>
  );
}

/** Casca comum dos dois painéis — cabeçalho colapsável + rodapé de ação. */
function ChecklistPanel({
  phase,
  eyebrow,
  title,
  badge,
  headerActions,
  open,
  onToggleOpen,
  saving,
  onSave,
  saveLabel,
  children,
}: {
  phase: Phase;
  eyebrow: string;
  title: string;
  badge: string;
  headerActions?: React.ReactNode;
  open: boolean;
  onToggleOpen: () => void;
  saving: boolean;
  onSave: () => void;
  saveLabel: string;
  children: React.ReactNode;
}) {
  const tone = PHASE[phase];

  return (
    <Card className="flex flex-col h-fit">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border mb-4">
        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded={open}
          className="flex-1 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <span className="text-caption uppercase tracking-wider text-text-subtle block mb-0.5">
            {eyebrow}
          </span>
          <span className={cn('text-h3 flex items-center gap-2', tone.accent)}>
            <span className={cn('w-1.5 h-1.5 rounded-full', tone.dot)} aria-hidden />
            {title}
          </span>
        </button>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {headerActions}
          <span className="text-caption uppercase tracking-wider bg-surface-sunken border border-border text-text-muted px-2.5 py-1 rounded-full">
            {badge}
          </span>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-text-subtle transition-transform duration-250 ease-in-out',
              open && 'rotate-180',
            )}
            aria-hidden
          />
        </div>
      </div>

      {open && (
        <>
          <div className="flex-1 space-y-1">{children}</div>
          <div className="mt-6 pt-6 border-t border-border">
            <Button
              fullWidth
              loading={saving}
              icon={<Check className="w-4 h-4" />}
              onClick={onSave}
            >
              {saveLabel}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

interface ChecklistSectionProps {
  status: string;
  checklistTemplateItems: ChecklistTemplateItem[];
  entryChecklist: OrderChecklist;
  setEntryChecklist: React.Dispatch<React.SetStateAction<OrderChecklist>>;
  exitChecklist: OrderChecklist;
  setExitChecklist: React.Dispatch<React.SetStateAction<OrderChecklist>>;
  handleSaveChecklists: (type: 'entry' | 'exit') => Promise<void>;
  savingChecklist: boolean;
}

export function ChecklistSection({
  status,
  checklistTemplateItems,
  entryChecklist,
  setEntryChecklist,
  exitChecklist,
  setExitChecklist,
  handleSaveChecklists,
  savingChecklist
}: ChecklistSectionProps) {
  const [isEntryOpen, setIsEntryOpen] = useState(true);
  const [isExitOpen, setIsExitOpen] = useState(true);
  const showExit = status === 'Finalizado';

  return (
    <div className="mt-8 space-y-4 lg:col-span-3">
      <h2 className="text-h2 text-text flex items-center gap-2 mb-6">
        <CheckCircle2 className="w-6 h-6 text-text-subtle" aria-hidden /> Checklist e Condições
      </h2>
      <div className={cn('grid grid-cols-1 gap-8', showExit && 'lg:grid-cols-2')}>
        {/* Bloco de Entrada */}
        <ChecklistPanel
          phase="entry"
          eyebrow="Fase de Recebimento"
          title="Entrada"
          badge="Preenchimento Inicial"
          open={isEntryOpen}
          onToggleOpen={() => setIsEntryOpen(!isEntryOpen)}
          saving={savingChecklist}
          onSave={() => handleSaveChecklists('entry')}
          saveLabel="Salvar Checklist de Entrada"
        >
          {checklistTemplateItems.map((item) => (
            <ChecklistItemRow
              key={item.id}
              label={item.label}
              field={item.id}
              checklist={entryChecklist}
              setChecklist={setEntryChecklist}
            />
          ))}

          {/* Senha / PIN — separada dos itens dinâmicos por divisória */}
          <div className="pt-4 mt-2 border-t border-border">
            <div
              className={cn(
                'rounded-xl px-3 py-3 -mx-3 grid grid-cols-[1fr_auto] gap-4 items-center',
                'transition-colors duration-150 hover:bg-surface-sunken',
                entryChecklist.password_pin.has_password && 'bg-surface-sunken',
              )}
            >
              <span className="text-small text-text-muted">Possui Senha / PIN?</span>
              <Toggle
                phase="entry"
                label="Possui senha ou PIN"
                checked={entryChecklist.password_pin.has_password}
                onChange={() => setEntryChecklist(prev => ({
                  ...prev,
                  password_pin: { ...prev.password_pin, has_password: !prev.password_pin.has_password }
                }))}
              />
            </div>
            {entryChecklist.password_pin.has_password && (
              <input
                type="text"
                aria-label="Senha do equipamento"
                placeholder="Senha do equipamento"
                value={entryChecklist.password_pin.password_value}
                onChange={(e) => setEntryChecklist(prev => ({
                  ...prev,
                  password_pin: { ...prev.password_pin, password_value: e.target.value }
                }))}
                className="w-full mt-2 bg-transparent border-b border-border focus:border-brand px-1 py-1.5 text-small font-mono text-text placeholder:text-text-subtle focus:outline-none transition-colors"
              />
            )}
          </div>

          <div className="pt-4 border-t border-border">
            <Textarea
              label="Observações Gerais (Entrada)"
              rows={2}
              placeholder="Observações adicionais de recebimento"
              value={entryChecklist.general_notes}
              onChange={(e) => setEntryChecklist(prev => ({ ...prev, general_notes: e.target.value }))}
              className="resize-none min-h-0"
            />
          </div>
        </ChecklistPanel>

        {/* Bloco de Saída (Entrega) */}
        {showExit && (
          <ChecklistPanel
            phase="exit"
            eyebrow="Fase de Entrega"
            title="Saída"
            badge="Revisão Final"
            open={isExitOpen}
            onToggleOpen={() => setIsExitOpen(!isExitOpen)}
            saving={savingChecklist}
            onSave={() => handleSaveChecklists('exit')}
            saveLabel="Salvar Checklist de Saída"
            headerActions={
              <Button
                variant="secondary"
                size="sm"
                title="Copiar as condições registradas na Entrada"
                onClick={() => setExitChecklist(JSON.parse(JSON.stringify(entryChecklist)))}
              >
                Copiar da Entrada
              </Button>
            }
          >
            {checklistTemplateItems.map((item) => (
              <ChecklistItemRow
                key={item.id}
                label={item.label}
                field={item.id}
                checklist={exitChecklist}
                setChecklist={setExitChecklist}
                phase="exit"
              />
            ))}

            <div className="pt-4 border-t border-border">
              <Textarea
                label="Observações Gerais (Saída)"
                rows={2}
                placeholder="Observações adicionais de entrega"
                value={exitChecklist.general_notes}
                onChange={(e) => setExitChecklist(prev => ({ ...prev, general_notes: e.target.value }))}
                className="resize-none min-h-0"
              />
            </div>
          </ChecklistPanel>
        )}
      </div>
    </div>
  );
}

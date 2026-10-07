'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faAt,
  faPhone,
  faEnvelope,
  faFilm,
  faChartBar,
  faListUl,
  faUsers,
  faEye,
  faHeart,
  faBullhorn,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';
import { Input } from '@/src/components/ui/Input';
import { Select, type SelectOption } from '@/src/components/ui/Select';
import { maskPhone, maskInteger } from '@/src/lib/masks';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface DadosCadastraisData {
  nome: string;
  instagram: string;
  whatsapp: string;
  email: string;
  conteudoTipo: string | null;
  igSeguidores: string;
  igAlcance: string;
  igImpressoes: string;
  igInteracoes: string;
}

export type DadosCadastraisErrors = Partial<Record<keyof DadosCadastraisData, string>>;

interface StepDadosCadastraisProps {
  data: DadosCadastraisData;
  errors: DadosCadastraisErrors;
  onChange: <K extends keyof DadosCadastraisData>(field: K, value: DadosCadastraisData[K]) => void;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const CONTENT_TYPE_OPTIONS: SelectOption[] = [
  { value: 'pet-lifestyle', label: 'Pet lifestyle' },
  { value: 'humor', label: 'Humor / Entretenimento' },
  { value: 'educacional', label: 'Educacional / Dicas' },
  { value: 'review', label: 'Review / Unboxing' },
  { value: 'moda', label: 'Moda e estilo' },
  { value: 'viagem', label: 'Viagem / Aventura com pets' },
  { value: 'fitness', label: 'Fitness / Saúde' },
  { value: 'outros', label: 'Outros' },
];

const METRICS_PATH = [
  'Seu perfil',
  'Menu  ≡',
  'Insights',
  'Visão geral',
  'Últimos 30 dias',
];

// ─── Section title helper ───────────────────────────────────────────────────

function SectionTitle({ icon, text, badge }: { icon: React.ReactNode; text: string; badge?: string }) {
  return (
    <div className="cad-form-section-title">
      <span className="cad-form-section-title-icon">{icon}</span>
      {text}
      {badge && <span className="cad-form-section-badge">{badge}</span>}
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────

export function StepDadosCadastrais({ data, errors, onChange }: StepDadosCadastraisProps) {
  return (
    <div className="cad-form">
      <p className="cad-section-intro">
        Preencha seus dados para identificação no programa. Seja sincera nas informações.
        Os campos com <span className="cad-required-mark">*</span> são obrigatórios.
      </p>

      {/* ── Dados pessoais ── */}
      <SectionTitle icon={<FontAwesomeIcon icon={faUser} />} text="Identificação e Contato" />

      <div className="cad-form-row">
        <Input
          id="cad-nome"
          label="Nome completo *"
          placeholder="Como gosta de ser chamada"
          value={data.nome}
          onChange={(e) => onChange('nome', e.target.value)}
          icon={<FontAwesomeIcon icon={faUser} />}
          error={errors.nome}
        />
        <Input
          id="cad-whatsapp"
          label="WhatsApp *"
          placeholder="(11) 99999-9999"
          value={data.whatsapp}
          onChange={(e) => onChange('whatsapp', maskPhone(e.target.value))}
          icon={<FontAwesomeIcon icon={faPhone} />}
          error={errors.whatsapp}
        />
      </div>

      <div className="cad-form-row">
        <Input
          id="cad-email"
          label="E-mail *"
          type="email"
          placeholder="seu@email.com"
          value={data.email}
          onChange={(e) => onChange('email', e.target.value)}
          icon={<FontAwesomeIcon icon={faEnvelope} />}
          error={errors.email}
        />
        <Input
          id="cad-instagram"
          label="Instagram *"
          placeholder="@seuhandle"
          value={data.instagram}
          onChange={(e) => onChange('instagram', e.target.value)}
          icon={<FontAwesomeIcon icon={faAt} />}
          error={errors.instagram}
        />
      </div>

      <Select
        label="Tipo de conteúdo principal *"
        options={CONTENT_TYPE_OPTIONS}
        value={data.conteudoTipo}
        onChange={(v: unknown) => onChange('conteudoTipo', v as string | null)}
        icon={<FontAwesomeIcon icon={faFilm} />}
        error={errors.conteudoTipo}
        placeholder="Selecione a categoria..."
        clearable={false}
      />

      {/* ── Instagram Insights ── */}
      <SectionTitle
        icon={<FontAwesomeIcon icon={faChartBar} />}
        text="Métricas do Instagram"
        badge="opcional"
      />

      <div className="cad-metrics-guide">
        <div className="cad-metrics-guide-title">
          <FontAwesomeIcon icon={faListUl} className="cad-metrics-guide-title-icon" />
          Como encontrar no Instagram:
        </div>
        <div className="cad-metrics-path">
          {METRICS_PATH.map((step, i) => (
            <React.Fragment key={step}>
              <span className="cad-metrics-path-step">{step}</span>
              {i < METRICS_PATH.length - 1 && (
                <FontAwesomeIcon icon={faChevronRight} className="cad-metrics-path-arrow" />
              )}
            </React.Fragment>
          ))}
        </div>
        <p className="cad-metrics-guide-desc">
          Selecione <strong>Últimos 30 dias</strong> no painel de Insights da sua conta profissional. Se ainda não tiver acesso a essas métricas, pode deixar em branco.
        </p>
      </div>

      <div className="cad-metrics-grid">
        <Input
          id="cad-ig-seguidores"
          label="Total de seguidores"
          type="text"
          inputMode="numeric"
          placeholder="Ex: 5.200"
          value={data.igSeguidores}
          onChange={(e) => onChange('igSeguidores', maskInteger(e.target.value))}
          icon={<FontAwesomeIcon icon={faUsers} />}
        />
        <Input
          id="cad-ig-alcance"
          label="Contas alcançadas (mês)"
          type="text"
          inputMode="numeric"
          placeholder="Ex: 12.000"
          value={data.igAlcance}
          onChange={(e) => onChange('igAlcance', maskInteger(e.target.value))}
          icon={<FontAwesomeIcon icon={faBullhorn} />}
        />
        <Input
          id="cad-ig-impressoes"
          label="Impressões (mês)"
          type="text"
          inputMode="numeric"
          placeholder="Ex: 30.000"
          value={data.igImpressoes}
          onChange={(e) => onChange('igImpressoes', maskInteger(e.target.value))}
          icon={<FontAwesomeIcon icon={faEye} />}
        />
        <Input
          id="cad-ig-interacoes"
          label="Interações com conteúdo (mês)"
          type="text"
          inputMode="numeric"
          placeholder="Ex: 2.500"
          value={data.igInteracoes}
          onChange={(e) => onChange('igInteracoes', maskInteger(e.target.value))}
          icon={<FontAwesomeIcon icon={faHeart} />}
        />
      </div>
    </div>
  );
}

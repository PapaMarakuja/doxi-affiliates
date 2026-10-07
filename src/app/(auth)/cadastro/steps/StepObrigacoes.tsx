'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarXmark,
  faHandshake,
  faHeartCrack,
} from '@fortawesome/free-solid-svg-icons';
import { Checkbox } from '@/src/components/ui/Checkbox';

interface StepObrigacoesProps {
  agreed: boolean;
  onChange: (v: boolean) => void;
  error?: string;
}

export function StepObrigacoes({ agreed, onChange, error }: StepObrigacoesProps) {
  return (
    <div className="cad-obligations">
      <p className="cad-section-intro">
        Não trabalhamos com metas forçadas nem cobranças que atrapalhem sua criatividade. Valorizamos parcerias leves, transparentes e presentes:
      </p>

      <div className="cad-obligation-items">
        <div className="cad-obligation-item">
          <div className="cad-obligation-item-icon">
            <FontAwesomeIcon icon={faCalendarXmark} />
          </div>
          <strong className="cad-obligation-item-title">
            Sem frequência obrigatória
          </strong>
          <p className="cad-obligation-item-text">
            Não exigimos mínimo de posts ou stories mensais. Você cria no seu próprio ritmo e de acordo com a sua rotina.
          </p>
        </div>

        <div className="cad-obligation-item">
          <div className="cad-obligation-item-icon">
            <FontAwesomeIcon icon={faHandshake} />
          </div>
          <strong className="cad-obligation-item-title">
            Mão dupla e boa fé
          </strong>
          <p className="cad-obligation-item-text">
            Oferecemos suporte, vales e comissões. Em troca, esperamos comunicação sincera e carinho com a nossa marca.
          </p>
        </div>

        <div className="cad-obligation-item cad-obligation-item--warning">
          <div className="cad-obligation-item-icon cad-obligation-item-icon--warning">
            <FontAwesomeIcon icon={faHeartCrack} />
          </div>
          <strong className="cad-obligation-item-title">
            A gente sente sua falta!
          </strong>
          <p className="cad-obligation-item-text">
            Inatividade longa sem aviso pode levar à suspensão de vales ou do cadastro. Se precisar de uma pausa, avise a gente com um &quot;oi&quot;!
          </p>
        </div>
      </div>

      <div className="cad-rules-agreement">
        <Checkbox
          label="Eu li e concordo com as diretrizes de parceria do programa DoxiClub"
          checked={agreed}
          onChange={onChange}
        />
        {error && (
          <span className="cad-field-error">{error}</span>
        )}
      </div>
    </div>
  );
}

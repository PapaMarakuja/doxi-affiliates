'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleCheck,
  faEnvelope,
  faCommentDots,
  faClock,
} from '@fortawesome/free-solid-svg-icons';

export function StepFinalizacao() {
  return (
    <div className="cad-finalizacao">
      <div className="cad-finalizacao-icon">
        <FontAwesomeIcon icon={faCircleCheck} />
      </div>

      <h2 className="cad-finalizacao-title">Candidatura enviada!</h2>
      <p className="cad-finalizacao-subtitle">
        Que alegria receber a sua inscrição! Agora é com a gente: vamos avaliar seu perfil com muito carinho.
      </p>

      <div className="cad-finalizacao-details">
        <div className="cad-finalizacao-detail">
          <div className="cad-finalizacao-detail-icon">
            <FontAwesomeIcon icon={faClock} />
          </div>
          <strong>Prazo de análise</strong>
          <p>Retorno em até 5 dias úteis (costumamos responder antes!).</p>
        </div>

        <div className="cad-finalizacao-detail">
          <div className="cad-finalizacao-detail-icon">
            <FontAwesomeIcon icon={faCommentDots} />
          </div>
          <strong>Via WhatsApp</strong>
          <p>Contataremos pelo WhatsApp informado para os próximos passos.</p>
        </div>

        <div className="cad-finalizacao-detail">
          <div className="cad-finalizacao-detail-icon">
            <FontAwesomeIcon icon={faEnvelope} />
          </div>
          <strong>Confirmação por e-mail</strong>
          <p>Você também receberá um resumo por e-mail (verifique o spam).</p>
        </div>
      </div>

      <p className="cad-finalizacao-note">
        Enquanto isso, continue criando conteúdo lindo com seus peludos. Se tiver dúvidas, estamos por aqui!
      </p>
    </div>
  );
}

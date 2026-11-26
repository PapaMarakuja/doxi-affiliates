"use client";

import React, { useState, useCallback, createContext, useContext, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faChevronRight,
  faChevronLeft,
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/src/components/ui/Button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WizardSubStep {
  /** Unique key within the parent step */
  key: string;
  /** Label shown in the sub-step indicator */
  label: string;
  /** Content rendered when this sub-step is active */
  content: React.ReactNode;
  /**
   * Called before leaving this sub-step.
   * Return `true` to allow navigation, `false` to block, or a string error message to block with a custom message.
   */
  canExit?: () => boolean | string | Promise<boolean | string>;
}

export interface WizardStep {
  /** Unique key */
  key: string;
  /** Label shown in the step indicator bar */
  label: string;
  /** FontAwesome icon element shown inside the step circle */
  icon?: React.ReactNode;
  /**
   * Sub-steps for this step. When provided, `content` and `canExit` on the
   * step itself are ignored — each sub-step defines its own content/canExit.
   */
  subSteps?: WizardSubStep[];
  /** Content rendered when this step is active (only used when subSteps is absent) */
  content?: React.ReactNode;
  /**
   * Called before leaving this step (ignored when subSteps is present).
   * Return `true` to allow navigation, `false` to block, or a string error message.
   */
  canExit?: () => boolean | string | Promise<boolean | string>;
}

export interface WizardProps {
  steps: WizardStep[];
  /** Called after successfully passing the last step/sub-step */
  onComplete: () => void | Promise<void>;
  /** Label for the final submit button */
  completeLabel?: string;
  /** Label for the "next" button */
  nextLabel?: string;
  /** Label for the "back" button */
  backLabel?: string;
  /** Whether to show step labels below the circles */
  showStepLabels?: boolean;
  /** Disable navigation controls while true (e.g. submitting) */
  loading?: boolean;
  /** Size for navigation buttons (default: "sm") */
  buttonSize?: "sm" | "md" | "lg";
}

// ---------------------------------------------------------------------------
// Context — lets step content imperatively access wizard navigation
// ---------------------------------------------------------------------------

interface WizardContextValue {
  currentStepIndex: number;
  currentSubStepIndex: number;
  goNext: () => void;
  goBack: () => void;
}

const WizardContext = createContext<WizardContextValue | null>(null);

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used inside a <Wizard> component");
  return ctx;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function runCanExit(
  canExit: (() => boolean | string | Promise<boolean | string>) | undefined
): Promise<{ allowed: boolean; error: string | null }> {
  if (!canExit) return { allowed: true, error: null };
  const result = await canExit();
  if (result === true) return { allowed: true, error: null };
  if (result === false) {
    return { allowed: false, error: "Por favor, preencha todos os campos obrigatórios." };
  }
  return { allowed: false, error: result as string };
}

// ---------------------------------------------------------------------------
// Wizard Component
// ---------------------------------------------------------------------------

export function Wizard({
  steps,
  onComplete,
  completeLabel = "Concluir",
  nextLabel = "Próximo",
  backLabel = "Voltar",
  showStepLabels = true,
  loading = false,
  buttonSize = "sm",
}: WizardProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentSubStepIndex, setCurrentSubStepIndex] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [exitError, setExitError] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);

  const wizardRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const frameId = requestAnimationFrame(() => {
      if (wizardRef.current) {
        wizardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        wizardRef.current.focus({ preventScroll: true });
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, [currentStepIndex, currentSubStepIndex]);

  const currentStep = steps[currentStepIndex];
  const hasSubSteps = Boolean(currentStep?.subSteps?.length);
  const subSteps = currentStep?.subSteps ?? [];
  const isLastStep = currentStepIndex === steps.length - 1;
  const isLastSubStep = !hasSubSteps || currentSubStepIndex === subSteps.length - 1;

  const activeCanExit = hasSubSteps
    ? subSteps[currentSubStepIndex]?.canExit
    : currentStep?.canExit;

  const goNext = useCallback(async () => {
    if (navigating || loading) return;
    setNavigating(true);
    setExitError(null);

    const { allowed, error } = await runCanExit(activeCanExit);
    if (!allowed) {
      setExitError(error);
      setNavigating(false);
      return;
    }

    setDirection("next");
    if (hasSubSteps && !isLastSubStep) {
      setCurrentSubStepIndex((i) => i + 1);
    } else if (!isLastStep) {
      setCurrentStepIndex((i) => i + 1);
      setCurrentSubStepIndex(0);
    } else {
      await onComplete();
    }

    setNavigating(false);
  }, [navigating, loading, activeCanExit, hasSubSteps, isLastSubStep, isLastStep, onComplete]);

  const goBack = useCallback(() => {
    if (navigating || loading) return;
    setExitError(null);
    setDirection("prev");

    if (hasSubSteps && currentSubStepIndex > 0) {
      setCurrentSubStepIndex((i) => i - 1);
    } else if (currentStepIndex > 0) {
      setCurrentStepIndex((i) => i - 1);
      const prevStep = steps[currentStepIndex - 1];
      const prevSubCount = prevStep?.subSteps?.length ?? 0;
      setCurrentSubStepIndex(prevSubCount > 0 ? prevSubCount - 1 : 0);
    }
  }, [navigating, loading, hasSubSteps, currentSubStepIndex, currentStepIndex, steps]);

  const isAtStart = currentStepIndex === 0 && currentSubStepIndex === 0;
  const isFinalAction = isLastStep && isLastSubStep;
  const stepKey = `${currentStepIndex}_${currentSubStepIndex}`;

  const activeContent = hasSubSteps
    ? subSteps[currentSubStepIndex]?.content
    : currentStep?.content;

  return (
    <WizardContext.Provider value={{ currentStepIndex, currentSubStepIndex, goNext, goBack }}>
      <div
        className="wizard"
        ref={wizardRef}
        tabIndex={-1}
      >
        {/* Step Indicator Bar */}
        <div className="wizard-steps" role="list" aria-label="Etapas do formulário">
          {steps.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isActive = idx === currentStepIndex;

            return (
              <React.Fragment key={step.key}>
                <div
                  className={[
                    "wizard-step-item",
                    isActive ? "wizard-step-item--active" : "",
                    isCompleted ? "wizard-step-item--completed" : "",
                    !isActive && !isCompleted ? "wizard-step-item--pending" : "",
                  ].join(" ").trim()}
                  role="listitem"
                  aria-current={isActive ? "step" : undefined}
                >
                  <div className="wizard-step-circle">
                    {isCompleted ? (
                      <FontAwesomeIcon icon={faCheck} />
                    ) : (
                      step.icon ?? (
                        <span className="wizard-step-number">{idx + 1}</span>
                      )
                    )}
                  </div>
                  {showStepLabels && (
                    <span className="wizard-step-label">{step.label}</span>
                  )}
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={[
                      "wizard-step-connector",
                      isCompleted ? "wizard-step-connector--completed" : "",
                    ].join(" ").trim()}
                    aria-hidden="true"
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Dedicated active step title shown when screen is too narrow for individual labels */}
        {showStepLabels && currentStep?.label && (
          <div className="wizard-active-title" aria-live="polite">
            {currentStep.label}
          </div>
        )}

        {/* Sub-step breadcrumb indicator */}
        {hasSubSteps && (
          <div className="wizard-substeps" role="list" aria-label="Sub-etapas">
            {subSteps.map((sub, idx) => {
              const isSubCompleted = idx < currentSubStepIndex;
              const isSubActive = idx === currentSubStepIndex;
              return (
                <React.Fragment key={sub.key}>
                  <div
                    className={[
                      "wizard-substep-item",
                      isSubActive ? "wizard-substep-item--active" : "",
                      isSubCompleted ? "wizard-substep-item--completed" : "",
                    ].join(" ").trim()}
                    role="listitem"
                  >
                    <div className="wizard-substep-dot">
                      {isSubCompleted && (
                        <FontAwesomeIcon icon={faCheck} className="text-[8px]" />
                      )}
                    </div>
                    <span className="wizard-substep-label">{sub.label}</span>
                  </div>
                  {idx < subSteps.length - 1 && (
                    <FontAwesomeIcon
                      icon={faChevronRight}
                      className="wizard-substep-separator"
                      aria-hidden="true"
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Active Content with smooth step/substep animation */}
        <div className="wizard-content">
          <div
            key={stepKey}
            className={`wizard-content-animated wizard-content-animated--${direction}`}
          >
            {activeContent}
          </div>
        </div>

        {/* Validation Error */}
        {exitError && (
          <div className="wizard-error" role="alert">
            <span className="wizard-error-icon">✕</span>
            <span>{exitError}</span>
          </div>
        )}

        {/* Navigation */}
        <div className="wizard-nav">
          <Button
            variant="transparent"
            outline
            size={buttonSize}
            className="wizard-btn-sm"
            onClick={goBack}
            disabled={isAtStart || navigating || loading}
            aria-label="Voltar para etapa anterior"
          >
            <FontAwesomeIcon icon={faChevronLeft} />
            {backLabel}
          </Button>

          <Button
            variant={isFinalAction ? "success" : "primary"}
            size={buttonSize}
            className="wizard-btn-sm"
            onClick={goNext}
            loading={navigating || loading}
            aria-label={isFinalAction ? completeLabel : nextLabel}
          >
            {isFinalAction ? completeLabel : nextLabel}
            {!isFinalAction && !navigating && !loading && <FontAwesomeIcon icon={faChevronRight} />}
            {isFinalAction && !navigating && !loading && <FontAwesomeIcon icon={faCheck} />}
          </Button>
        </div>
      </div>
    </WizardContext.Provider>
  );
}

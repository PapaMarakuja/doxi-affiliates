"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleQuestion,
  faCircleCheck,
  faTriangleExclamation,
  faSkullCrossbones,
} from "@fortawesome/free-solid-svg-icons";
import { Modal } from "./Modal";
import {
  useConfirmDialogInternal,
  type ConfirmDialogType,
} from "@/src/contexts/ConfirmDialogContext";
import { Button } from "./Button";

const DIALOG_CONFIG: Record<
  ConfirmDialogType,
  { icon: typeof faCircleQuestion; className: string; label: string }
> = {
  question: { icon: faCircleQuestion, className: "confirm-dialog--question", label: "Pergunta" },
  success: { icon: faCircleCheck, className: "confirm-dialog--success", label: "Sucesso" },
  warning: { icon: faTriangleExclamation, className: "confirm-dialog--warning", label: "Atenção" },
  danger: { icon: faSkullCrossbones, className: "confirm-dialog--danger", label: "Perigo" },
};

const CONFIRM_VARIANT: Record<ConfirmDialogType, "primary" | "danger" | "info"> = {
  question: "primary",
  success: "primary",
  warning: "primary",
  danger: "danger",
};

export function ConfirmDialog() {
  const { dialogState, handleConfirm, handleCancel } = useConfirmDialogInternal();
  const { isOpen, title, message, confirmText, cancelText, type, allowClickOutside } = dialogState;

  const config = DIALOG_CONFIG[type ?? "question"];
  const confirmVariant = CONFIRM_VARIANT[type ?? "question"];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      size="sm"
      closeOnOverlayClick={allowClickOutside ?? true}
      id="confirm-dialog"
      title={title || undefined}
    >
      <div className={`confirm-dialog-body ${config.className}`}>
        <div className="confirm-dialog-icon-wrapper">
          <FontAwesomeIcon icon={config.icon} className="confirm-dialog-icon" />
        </div>
        <p className="confirm-dialog-message">{message}</p>
      </div>
      <div className="confirm-dialog-actions">
        <Button
          variant="primary"
          outline
          style={{ width: "auto", flex: 1 }}
          onClick={handleCancel}
          type="button"
        >
          {cancelText || "Cancelar"}
        </Button>
        <Button
          variant={confirmVariant}
          style={{ width: "auto", flex: 1 }}
          onClick={handleConfirm}
          type="button"
        >
          {confirmText || "Confirmar"}
        </Button>
      </div>
    </Modal>
  );
}

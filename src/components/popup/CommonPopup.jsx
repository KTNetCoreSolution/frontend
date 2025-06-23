import React, { useState, useEffect } from "react";
import styles from "./CommonPopup.module.css";

const CommonPopup = ({
  show,
  onHide,
  onConfirm,
  title,
  children,
  buttons = [],
  requiresConfirm = false,
  confirmMessage = "",
}) => {
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
        setToastMessage("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  useEffect(() => {
    // Reset states when the popup is hidden
    if (!show) {
      setShowConfirmDialog(false);
      setPendingAction(null);
      setShowToast(false);
      setToastMessage("");
    }
  }, [show]);

  const handleConfirm = async (action) => {
    try {
      const { result, onSuccess } = await action();
      if (result && result.error) {
        setToastMessage(result.error);
        setShowToast(true);
      } else if (result && result.success) {
        setToastMessage(result.success);
        setShowToast(true);
        return { onSuccess };
      }
    } catch (error) {
      setToastMessage("오류가 발생했습니다: " + error.message);
      setShowToast(true);
    }
    return {};
  };

  const handleButtonClick = (action) => {
    if (action === onHide) {
      // Directly call onHide without confirmation
      onHide();
    } else if (requiresConfirm) {
      // Show confirmation dialog for other actions
      setPendingAction(() => action);
      setShowConfirmDialog(true);
    } else {
      // Execute action directly if no confirmation is required
      handleConfirm(action);
    }
  };

  const handleConfirmDialogConfirm = () => {
    if (pendingAction) {
      handleConfirm(pendingAction);
    }
    setShowConfirmDialog(false);
    setPendingAction(null);
  };

  const handleConfirmDialogCancel = () => {
    setShowConfirmDialog(false);
    setPendingAction(null);
  };

  if (!show) return null;

  const defaultButtons = [
  { label: "취소", className: `${styles.btn} ${styles.btnSecondary} btn btn-secondary`, action: onHide },
  { label: "확인", className: `${styles.btn} ${styles.btnPrimary} btn text-bg-success`, action: onConfirm },
  ];

  const activeButtons = buttons.length > 0 ? buttons.slice(0, 5) : defaultButtons;

  return (
    <>
      <div className={styles.overlay} onClick={onHide}></div>
      <div className={`${styles.modal} show d-block`} tabIndex="-1">
        <div className={`${styles.modalDialog} modal-dialog-centered`}>
          <div className={`${styles.modalContent} modal-content`}>
            <div className={`${styles.modalHeader} modal-header`}>
              <h5 className={`${styles.modalTitle} modal-title`}>{title}</h5>
              <button type="button" className={`${styles.btnClose} btn-close`} onClick={onHide}></button>
            </div>
            <div className={`${styles.modalBody} modal-body`}>
              {children}
              {showToast && (
                <div className={`${styles.toast} alert alert-danger`} role="alert">
                  {toastMessage}
                </div>
              )}
            </div>
            <div className={`${styles.modalFooter} modal-footer`}>
              {activeButtons.map((btn, index) => (
                <button
                  key={index}
                  type="button"
                  className={`${styles.margin1} ${btn.className}`}
                  onClick={() => handleButtonClick(btn.action)}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <CommonPopup
        show={showConfirmDialog}
        onHide={handleConfirmDialogCancel}
        title="확인"
        buttons={[
          { label: "취소", className: `${styles.btn} ${styles.btnSecondary} btn btn-secondary`, action: handleConfirmDialogCancel },
          { label: "확인", className: `${styles.btn} ${styles.btnPrimary} btn text-bg-success`, action: handleConfirmDialogConfirm },
        ]}
      >
        <p>{confirmMessage || "이 작업을 진행하시겠습니까?"}</p>
      </CommonPopup>
    </>
  );
};

export default CommonPopup;
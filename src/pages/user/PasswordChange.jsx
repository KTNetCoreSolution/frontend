import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import commonUtils from '../../utils/common.js';
import { fetchData } from '../../utils/dataUtils';
import { msgPopup } from '../../utils/msgPopup';
import styles from './Join.module.css';

const PasswordChange = ({ show, onHide, initialEmpNo, isEditable }) => {
  const [empNo, setEmpNo] = useState(initialEmpNo || '');
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (show) {
      setEmpNo(initialEmpNo || '');
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setError('');
    }
  }, [show, initialEmpNo]);

  const validateForm = () => {
    if (!empNo || !currentPwd || !newPwd || !confirmPwd) {
      return "필수 입력 항목을 모두 채워주세요.";
    }

    const empNoValidation = commonUtils.validateVarcharLength(empNo, 20, '아이디');
    if (!empNoValidation.valid) return empNoValidation.error;

    if (newPwd.length < 6) {
      return "새 비밀번호는 최소 6자 이상이어야 합니다.";
    }

    if (newPwd !== confirmPwd) {
      return "새 비밀번호와 확인 비밀번호가 일치하지 않습니다.";
    }

    if (currentPwd === newPwd) {
      return "현재 비밀번호와 새 비밀번호가 동일할 수 없습니다.";
    }

    return '';
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const params = {
          pEMPNO: empNo,
          pEMPPWD: currentPwd,
          pDEBUG: "F"
        };

      const checkResponse = await fetchData('auth/password/list', params );

      if (!checkResponse.success || !checkResponse.data) {
        setError("입력한 비밀번호와 현재 비밀번호가 다릅니다.");
        return;
      }

      // If the current password is correct, proceed with saving the new password
      const userData = {
        pGUBUN: 'U',
        pEMPNO: empNo,
        pEMPPWD: newPwd
      };

      const saveResponse = await fetchData('auth/password/save', userData );

      if (!saveResponse.success) {
        throw new Error(saveResponse.errMsg || '비밀번호 변경에 실패했습니다.');
      } else {
        if (saveResponse.errMsg !== '') {
          setError(saveResponse.errMsg);
        } else {
          msgPopup("비밀번호가 성공적으로 변경되었습니다.");
          navigate('/login');
          onHide();
        }
      }
    } catch (error) {
      console.error('Password change error:', error.message);
      setError(error.message || '비밀번호 변경 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  if (!show) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onHide}></div>
      <div className={`${styles.modal} show d-block`} tabIndex="-1">
        <div className={`${styles.modalDialog} modal-dialog-centered`}>
          <div className={`${styles.modalContent} modal-content`}>
            <div className={`${styles.modalHeader} modal-header`}>
              <h5 className={`${styles.modalTitle} modal-title`}>비밀번호 변경</h5>
              <button type="button" className={`${styles.btnClose} btn-close`} onClick={onHide}></button>
            </div>
            <div className={`${styles.modalBody} modal-body`}>
              <form onSubmit={handlePasswordChange}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="empNo" className="form-label">
                      <i className="bi bi-person me-2"></i>아이디 <i className="bi bi-asterisk text-danger"></i>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="empNo"
                      value={empNo}
                      onChange={(e) => isEditable && setEmpNo(e.target.value)} // Editable based on isEditable
                      disabled={!isEditable} // Non-editable if triggered by pwdChgYn
                      placeholder="아이디를 입력하세요"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="currentPwd" className="form-label">
                      <i className="bi bi-lock me-2"></i>현재 비밀번호 <i className="bi bi-asterisk text-danger"></i>
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      id="currentPwd"
                      value={currentPwd}
                      onChange={(e) => setCurrentPwd(e.target.value)}
                      required
                      placeholder="현재 비밀번호를 입력하세요"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="newPwd" className="form-label">
                      <i className="bi bi-lock-fill me-2"></i>새 비밀번호 <i className="bi bi-asterisk text-danger"></i>
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      id="newPwd"
                      value={newPwd}
                      onChange={(e) => setNewPwd(e.target.value)}
                      required
                      placeholder="새 비밀번호를 입력하세요"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="confirmPwd" className="form-label">
                      <i className="bi bi-lock-fill me-2"></i>비밀번호 확인 <i className="bi bi-asterisk text-danger"></i>
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      id="confirmPwd"
                      value={confirmPwd}
                      onChange={(e) => setConfirmPwd(e.target.value)}
                      required
                      placeholder="새 비밀번호를 입력하세요"
                    />
                  </div>
                </div>
                <button type="submit" className={`${styles.btn} w-100 mt-3`}>
                  <i className="bi bi-check-circle me-2"></i>변경
                </button>
                {error && <p className="text-danger text-center mt-2">{error}</p>}
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PasswordChange;
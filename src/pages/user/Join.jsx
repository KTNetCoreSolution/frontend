import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import commonUtils from '../../utils/common.js';
import { fetchData } from '../../utils/dataUtils';
import { msgPopup } from '../../utils/msgPopup';
import { errorMsgPopup } from '../../utils/errorMsgPopup';
import styles from './Join.module.css';

const Join = ({ show, onHide }) => {
  const [empNo, setEmpNo] = useState('');
  const [empNm, setEmpNm] = useState('');
  const [empPwd, setEmpPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [phone, setPhone] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (show) {
      setEmpNo('');
      setEmpNm('');
      setEmpPwd('');
      setConfirmPwd('');
      setPhone('');
      setMobile('');
      setEmail('');
    }
  }, [show]);

  const validateForm = () => {
    if (!empNo || !empNm || !empPwd || !confirmPwd || !mobile || !email) {
      return "필수 입력 항목을 모두 채워주세요.";
    }

    const empNoValidation = commonUtils.validateVarcharLength(empNo, 20, '아이디');
    if (!empNoValidation.valid) return empNoValidation.error;

    const empNmValidation = commonUtils.validateVarcharLength(empNm, 50, '이름');
    if (!empNmValidation.valid) return empNmValidation.error;

    const phoneValidation = commonUtils.validateVarcharLength(phone, 20, '전화번호');
    if (!phoneValidation.valid) return phoneValidation.error;

    const mobileValidation = commonUtils.validateVarcharLength(mobile, 20, '핸드폰번호');
    if (!mobileValidation.valid) return mobileValidation.error;

    const emailValidation = commonUtils.validateVarcharLength(email, 50, '이메일');
    if (!emailValidation.valid) return emailValidation.error;

    if (empPwd.length < 6) {
      return "비밀번호는 최소 6자 이상이어야 합니다.";
    }

    if (empPwd !== confirmPwd) {
      return "비밀번호와 비밀번호 확인이 일치하지 않습니다.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      return "유효한 이메일 형식이 아닙니다.";
    }

    const phoneRegex = /^(\d{2,3})-(\d{3,4})-(\d{3,4})$/;
    if (phone && !phoneRegex.test(phone)) {
      return "전화번호 형식이 올바르지 않습니다. (예: 02-1234-5678, 031-7777-7777)";
    }
    if (mobile && !phoneRegex.test(mobile)) {
      return "핸드폰번호 형식이 올바르지 않습니다. (예: 010-1234-5678, 010-7777-7777)";
    }

    return '';
  };

  const handleRegistration = async (e) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      errorMsgPopup(validationError);
      return;
    }

    const userData = {
      pGUBUN: 'I',
      pEMPNO: empNo,
      pEMPNM: empNm,
      pEMPPWD: empPwd,
      pPHONE: phone || '',
      pMOBILE: mobile,
      pEMAIL: email
    };

    try {
      const response = await fetchData('auth/join/save', userData);

      if (!response.success) {
        throw new Error(response.errMsg || '가입정보가 잘못되었습니다.');
      } else {
        if (response.errMsg !== '' || response.data[0].ERRCD !== '00') {
          let errMsg = response.errMsg;

          if (response.data[0].ERRMSG !== '') errMsg = response.data[0].ERRMSG;

          errorMsgPopup(errMsg);
        } else {
          msgPopup("가입되었습니다.");
          navigate('/login');
          onHide();
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      errorMsgPopup(error.message || '가입 중 오류가 발생했습니다. 다시 시도해주세요.');
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
              <h5 className={`${styles.modalTitle} modal-title`}>회원 가입</h5>
              <button type="button" className={`${styles.btnClose} btn-close`} onClick={onHide}></button>
            </div>
            <div className={`${styles.modalBody} modal-body`}>
              <form onSubmit={handleRegistration}>
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
                      onChange={(e) => setEmpNo(e.target.value)}
                      required
                      placeholder="아이디를 입력하세요"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="empNm" className="form-label">
                      <i className="bi bi-person-fill me-2"></i>이름 <i className="bi bi-asterisk text-danger"></i>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="empNm"
                      value={empNm}
                      onChange={(e) => setEmpNm(e.target.value)}
                      required
                      placeholder="이름을 입력하세요"
                    />
                  </div>
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="empPwd" className="form-label">
                      <i className="bi bi-lock me-2"></i>비밀번호 <i className="bi bi-asterisk text-danger"></i>
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      id="empPwd"
                      value={empPwd}
                      onChange={(e) => setEmpPwd(e.target.value)}
                      required
                      placeholder="비밀번호를 입력하세요"
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
                      placeholder="비밀번호를 입력하세요"
                    />
                  </div>
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="phone" className="form-label">
                      <i className="bi bi-telephone me-2"></i>전화번호
                    </label>
                    <input
                      type="tel"
                      className="form-control"
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(예: 02-1234-5678)"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="mobile" className="form-label">
                      <i className="bi bi-phone me-2"></i>핸드폰번호 <i className="bi bi-asterisk text-danger"></i>
                    </label>
                    <input
                      type="tel"
                      className="form-control"
                      id="mobile"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)} // Fixed typo: setPhone -> setMobile
                      required
                      placeholder="(예: 010-1234-5678)"
                    />
                  </div>
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="email" className="form-label">
                      <i className="bi bi-envelope me-2"></i>이메일 <i className="bi bi-asterisk text-danger"></i>
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="이메일을 입력하세요"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    {/* Empty div to maintain layout balance */}
                  </div>
                </div>
                <button type="submit" className={`${styles.btn} w-100 mt-3`}>
                  <i className="bi bi-person-plus me-2"></i>가입
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Join;
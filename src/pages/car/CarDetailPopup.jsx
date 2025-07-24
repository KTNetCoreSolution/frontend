import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import commonUtils from '../../utils/common.js';
import { fetchData } from '../../utils/dataUtils.js';
import { msgPopup } from '../../utils/msgPopup.js';
import { errorMsgPopup } from '../../utils/errorMsgPopup.js';
import styles from './Join.module.css';

const CarInfoDetailPopup = ({ show, onHide }) => {
  const [carNo, setCarNo] = useState('');
  const [carId, setCarId] = useState('');
  const [rentalType, setRentalType] = useState('');
  const [mgmtStatus, setMgmtStatus] = useState('');
  const [carType, setCarType] = useState('');
  const [carClass, setCarClass] = useState('');
  const [carSize, setCarSize] = useState('');
  const [carNm, setCarNm] = useState('');
  const [useFuel, setUseFuel] = useState('');
  const [mainCompPhone, setMainCompPhone] = useState('');
  const [carAcquiredDt, setCarAcquiredDt] = useState('');
  const [rentalExfiredDt, setRentalExfiredDt] = useState('');
  const [carRegDate, setCarRegDate] = useState('');
  const [carPrice, setCarPrice] = useState('');
  const [rentalPrice, setRentalPrice] = useState('');
  const [orgGroup, setOrgGroup] = useState('');
  const [orgCd, setOrgCd] = useState('');
  const [primaryMngEmpNo, setPrimaryMngEmpNo] = useState('');
  const [primaryMngEmpNm, setPrimaryMngEmpNm] = useState('');
  const [primaryMngMobile, setPrimaryMngMobile] = useState('');
  const [primaryGarageAddr, setPrimaryGarageAddr] = useState('');
  const [notice, setNotice] = useState('');
  const [under26AgeEmpNo, setUnder26AgeEmpNo] = useState('');
  const [under26AgeEmpNm, setUnder26AgeEmpNm] = useState('');
  const [under26AgeJuminBirthNo, setUnder26AgeJuminBirthNo] = useState('');
  const [under26AgeChgDt, setUnder26AgeChgDt] = useState('');
  const [cardNo, setCardNo] = useState('');
  const [exfireDt, setExfireDt] = useState('');
  const [notice2, setNotice2] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const initializeComponent = async () => {
      // 다른 컴포넌트 렌더링 대기
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Component에 들어갈 데이터 로딩
    };

    initializeComponent();

    // 컴포넌트 언마운트 시 테이블 정리
    return () => {
    };
  }, []);
  
  useEffect(() => {
    if (show) {
      setCarNo('');
      setCarId('');
      setRentalType('');
      setMgmtStatus('');
      setCarType('');
      setCarClass('');
      setCarSize('');
      setCarNm('');
      setUseFuel('');
      setMainCompPhone('');
      setCarAcquiredDt('');
      setRentalExfiredDt('');
      setCarRegDate('');
      setCarPrice('');
      setRentalPrice('');
      setOrgGroup('');
      setOrgCd('');
      setPrimaryMngEmpNo('');
      setPrimaryMngEmpNm('');
      setPrimaryMngMobile('');
      setPrimaryGarageAddr('');
      setNotice('');
      setUnder26AgeEmpNo('');
      setUnder26AgeEmpNm('');
      setUnder26AgeJuminBirthNo('');
      setUnder26AgeChgDt('');
      setCardNo('');
      setExfireDt('');
      setNotice2('');
    }
  }, [show]);
  
  const validateForm = () => {
    if (!carNo || !rentalType || !carType || !carClass || !carSize || !carNm || !useFuel || !mainCompPhone || !carSize || !orgGroup || !orgCd) {
      return "필수 입력 항목을 모두 채워주세요.";
    }

    const carNoValidation = commonUtils.validateVarcharLength(carNo, 20, '차량번호');
    if (!carNoValidation.valid) return carNoValidation.error;

    const carIdValidation = commonUtils.validateVarcharLength(carId, 30, '차대번호');
    if (!carIdValidation.valid) return carIdValidation.error;

    const carNmValidation = commonUtils.validateVarcharLength(carNm, 50, '차명');
    if (!carNmValidation.valid) return carNmValidation.error;

    const mainCompPhoneValidation = commonUtils.validateVarcharLength(mainCompPhone, 50, '대표번호');
    if (!mainCompPhoneValidation.valid) return mainCompPhoneValidation.error;

    const primaryGarageAddrValidation = commonUtils.validateVarcharLength(primaryGarageAddr, 200, '차고지주소(정)');
    if (!primaryGarageAddrValidation.valid) return primaryGarageAddrValidation.error;

    const noticeValidation = commonUtils.validateVarcharLength(notice, 1500, '기타사항');
    if (!noticeValidation.valid) return noticeValidation.error;

    const notice2Validation = commonUtils.validateVarcharLength(notice2, 1500, '비고');
    if (!notice2Validation.valid) return notice2Validation.error;

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
        if (response.errMsg !== '' || response.data[0].errCd !== '00') {
          let errMsg = response.errMsg;

          if (response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;

          errorMsgPopup(errMsg);
        } else {
          msgPopup("가입되었습니다.");
          navigate('/'); // Changed from '/login'
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

export default CarInfoDetailPopup;
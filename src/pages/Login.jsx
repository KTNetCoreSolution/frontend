import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { performLogin, fetchCaptcha } from '../service/login';
import styles from './Login.module.css';
import Join from '../pages/user/Join';
import PasswordChange from '../pages/user/PasswordChange';
import { msgPopup } from '../utils/msgPopup';
import { errorMsgPopup } from '../utils/errorMsgPopup';
import LicensePopup from '../components/popup/LicensePopup';

const MOBILE_DOMAIN = import.meta.env.VITE_MOBILE_DOMAIN || 'localhost:9090';
const BASE_NAME = import.meta.env.VITE_BASE_NAME || '';

const Login = () => {
  const isLocal = import.meta.env.VITE_ENV === 'local';
  const [empNo, setEmpNo] = useState(isLocal ? 'admin' : '');
  const [empPwd, setEmpPwd] = useState(isLocal ? 'new1234!' : '');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaImage, setCaptchaImage] = useState(null);
  const [timer, setTimer] = useState(60);
  const [isCaptchaLoading, setIsCaptchaLoading] = useState(true);
  const [captchaError, setCaptchaError] = useState('');
  const [showJoinPopup, setShowJoinPopup] = useState(false);
  const [showPasswordChangePopup, setShowPasswordChangePopup] = useState(false);
  const [isManualPasswordChange, setIsManualPasswordChange] = useState(false);
  const [showLicensePopup, setShowLicensePopup] = useState(false);
  const navigate = useNavigate();

  // 타이머 관리
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          loadCaptcha();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 캡챠 이미지 로드 (재시도 로직 추가)
  const loadCaptcha = async (retryCount = 3) => {
    if (retryCount <= 0) {
      setIsCaptchaLoading(false);
      setCaptchaError('캡챠 이미지를 불러오지 못했습니다. 다시 시도해주세요.');
      return;
    }

    setIsCaptchaLoading(true);
    setCaptchaError('');
    try {
      const captchaUrl = await fetchCaptcha();
      setCaptchaImage(captchaUrl);
      setTimer(60);
      setIsCaptchaLoading(false);
    } catch (error) {
      console.error('캡챠 로드 실패, 재시도 남음:', retryCount - 1, error.message);
      setTimeout(() => loadCaptcha(retryCount - 1), 1000); // 1초 후 재시도
    }
  };

  // 컴포넌트 마운트 시 캡챠 로드
  useEffect(() => {
    loadCaptcha();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    const response = await performLogin('web', empNo, empPwd, captchaInput, navigate, (error) => {
      errorMsgPopup(error);
    });

    if (response && response.data.user.pwdChgYn === 'Y') {
      setIsManualPasswordChange(false);
      msgPopup("기간이 만료되어 비밀번호를 변경해야 합니다.");
      setShowPasswordChangePopup(true);
    }
  };

  const handleMobileLoginRedirect = () => {
    if (import.meta.env.VITE_ENV === 'local') {
      navigate('/mobile/Login');
    } else {
      const protocol = import.meta.env.VITE_ENV === 'local' ? 'http' : 'https';
      const basePath = BASE_NAME ? `/${BASE_NAME}` : '';
      window.location.href = `${protocol}://${MOBILE_DOMAIN}${basePath}`;
    }
  };

  const handleJoinClick = () => {
    setShowJoinPopup(true);
  };

  const handleLicenseClick = () => {
    setShowLicensePopup(true);
  };

  const handlePasswordChangeClick = () => {
    setIsManualPasswordChange(true);
    setShowPasswordChangePopup(true);
  };

  return (
    <div className={styles.loginContainer}>
      <h1 className={styles.title}>
        Login
      </h1>
      <form onSubmit={handleLogin}>
        <div className={styles.formGroup}>
          <label htmlFor="userid" className={styles.label}>
            <i className="bi bi-person"></i> 아이디
          </label>
          <input
            id="userid"
            type="text"
            value={empNo}
            onChange={(e) => setEmpNo(e.target.value)}
            placeholder="아이디를 입력하세요"
            required
            className={styles.input}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="password" className={styles.label}>
            <i className="bi bi-lock"></i> 비밀번호
          </label>
          <input
            id="password"
            type="password"
            value={empPwd}
            onChange={(e) => setEmpPwd(e.target.value)}
            placeholder="비밀번호를 입력하세요"
            required
            className={styles.input}
          />
        </div>
        <div className={styles.formGroup}>
          <div className={styles.captchaContainer}>
            {captchaImage ? (
              <img src={captchaImage} alt="CAPTCHA" className={styles.captchaImage} />
            ) : (
              <div className={styles.captchaPlaceholder}>
                {isCaptchaLoading ? 'Loading CAPTCHA...' : captchaError || '캡챠 로드 실패'}
              </div>
            )}
            <button
              type="button"
              className={styles.smallButton}
              onClick={loadCaptcha}
            >
              <i className="bi bi-arrow-repeat"></i>
            </button>
            <span className={styles.captchaTimer}>{timer}초</span>
          </div>
          <input
            id="captcha"
            type="text"
            value={captchaInput}
            onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
            placeholder="코드를 입력하세요"
            required
            className={styles.input}
          />
        </div>
        <div className={styles.buttonGroup}>
          <button type="submit" className={styles.loginButton}>
            <i className="bi bi-box-arrow-in-right"></i> 로그인
          </button>
          <button 
            type="button" 
            className={styles.smallButton}
            onClick={handleJoinClick}
          >
            <i className="bi bi-person-plus"></i>
          </button>
          <button 
            type="button" 
            className={styles.smallButton}
            onClick={handlePasswordChangeClick}
          >
            <i className="bi bi-key"></i>
          </button>
          <button
            type="button"
            className={styles.smallButton}
            onClick={handleLicenseClick}
          >
            <i className="bi bi-info-circle"></i>
          </button>
        </div>
        <button 
          type="button" 
          className={styles.button}
          onClick={handleMobileLoginRedirect}
        >
          <i className="bi bi-phone"></i> 모바일로그인으로 이동
        </button>
      </form>
      <Join show={showJoinPopup} onHide={() => setShowJoinPopup(false)} />
      <PasswordChange 
        show={showPasswordChangePopup} 
        onHide={() => setShowPasswordChangePopup(false)} 
        initialEmpNo={empNo} 
        isEditable={isManualPasswordChange}
      />
      <LicensePopup
        show={showLicensePopup}
        onHide={() => setShowLicensePopup(false)}
      />
    </div>
  );
};

export default Login;
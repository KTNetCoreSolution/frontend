import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { performLogin, fetchCaptcha } from '../../service/login';
import LicensePopup from '../../components/popup/LicensePopup';
import styles from './MobileLogin.module.css';

const MobileLogin = () => {
  const isLocal = import.meta.env.VITE_ENV === 'local';
  const [empNo, setEmpNo] = useState(isLocal ? 'admin' : '');
  const [empPwd, setEmpPwd] = useState(isLocal ? 'new1234!' : '');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaImage, setCaptchaImage] = useState(null); // Initialize as null
  const [error, setError] = useState('');
  const [showLicensePopup, setShowLicensePopup] = useState(false);
  const navigate = useNavigate();

  // Fetch CAPTCHA image on component mount
  useEffect(() => {
    loadCaptcha();
  }, []);

  const loadCaptcha = async () => {
    try {
      const captchaUrl = await fetchCaptcha();
      setCaptchaImage(captchaUrl);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleLicenseClick = () => {
    setShowLicensePopup(true);
  };

  const handleLogin = async () => {
    setError('');
    await performLogin('mobile', empNo, empPwd, captchaInput, navigate, setError);
  };

  return (
    <div className={`${styles.loginContainer}`}>
      <div className={styles.card}>
        <h1 className={styles.title}>로그인</h1>
        <div className={styles.formGroup}>
          <label htmlFor="userid" className={styles.label}>
            <i className="bi bi-person"></i> 아이디
          </label>
          <input
            id="userid"
            type="text"
            className={styles.input}
            value={empNo}
            onChange={(e) => setEmpNo(e.target.value)}
            placeholder="아이디를 입력하세요"
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="password" className={styles.label}>
            <i className="bi bi-lock"></i> 비밀번호
          </label>
          <input
            id="password"
            type="password"
            className={styles.input}
            value={empPwd}
            onChange={(e) => setEmpPwd(e.target.value)}
            placeholder="비밀번호를 입력하세요"
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="captcha" className={styles.label}>
            <i className="bi bi-shield-check"></i> 캡챠
          </label>
          <div className={styles.captchaContainer}>
            {captchaImage ? (
              <img src={captchaImage} alt="CAPTCHA" className={styles.captchaImage} />
            ) : (
              <div className={styles.captchaPlaceholder}>Loading CAPTCHA...</div>
            )}
            <button
              type="button"
              className={styles.smallButton}
              onClick={loadCaptcha}
            >
              <i className="bi bi-arrow-repeat"></i>
            </button>
          </div>
          <input
            id="captcha"
            type="text"
            className={styles.input}
            value={captchaInput}
            onChange={(e) => setCaptchaInput(e.target.value)}
            placeholder="캡챠 코드를 입력하세요"
            required
          />
        </div>
        <div className={styles.buttonGroup}>
          <button type="button" className={styles.button} onClick={handleLogin}>
            <i className="bi bi-box-arrow-in-right"></i> Login
          </button>
          <button
            type="button"
            className={styles.smallButton}
            onClick={handleLicenseClick}
          >
            <i className="bi bi-info-circle"></i>
          </button>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <LicensePopup
        show={showLicensePopup}
        onHide={() => setShowLicensePopup(false)}
      />
    </div>
  );
};

export default MobileLogin;
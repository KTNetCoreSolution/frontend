import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { performLogin } from '../../service/login';
import LicensePopup from '../../components/popup/LicensePopup';
import styles from './MobileLogin.module.css';

const MobileLogin = () => {
  const [empNo, setEmpNo] = useState('admin');
  const [empPwd, setEmpPwd] = useState('new1234!');
  const [error, setError] = useState('');
  const [showLicensePopup, setShowLicensePopup] = useState(false);
  const navigate = useNavigate();

  const handleLicenseClick = () => {
    setShowLicensePopup(true);
  };

  const handleLogin = async () => {
    setError('');
    await performLogin('mobile', empNo, empPwd, navigate, setError, '/mobile/Main');
  };

  return (
    <div className={`${styles.loginContainer} d-flex justify-content-center align-items-center vh-100`}>
      <div className={styles.card}>
        <h1 className={styles.title}>로그인</h1>
        <div className={styles.formGroup}>
          <label htmlFor="userid" className={styles.label}>아이디</label>
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
          <label htmlFor="password" className={styles.label}>비밀번호</label>
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
        <div className={styles.buttonGroup}>
          <button type="button" className={styles.button} onClick={handleLogin}>Login</button>
          {error && <p className={styles.error}>{error}</p>}
          <button
            type="button"
            className={styles.smallButton}
            onClick={handleLicenseClick}
          >
            <i className="bi bi-info-circle"></i>
          </button>
        </div>
      </div>
      <LicensePopup
        show={showLicensePopup}
        onHide={() => setShowLicensePopup(false)}
      />
    </div>
  );
};

export default MobileLogin;
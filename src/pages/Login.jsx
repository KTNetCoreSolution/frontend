import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { performLogin } from '../service/login';
import styles from './Login.module.css';
import Join from '../pages/user/Join';
import PasswordChange from '../pages/user/PasswordChange';
import { msgPopup } from '../utils/msgPopup';
import { errorMsgPopup } from '../utils/errorMsgPopup';
import LicensePopup from '../components/popup/LicensePopup';

const Login = () => {
  const [empNo, setEmpNo] = useState('admin');
  const [empPwd, setEmpPwd] = useState('new1234!');
  const [showJoinPopup, setShowJoinPopup] = useState(false);
  const [showPasswordChangePopup, setShowPasswordChangePopup] = useState(false);
  const [isManualPasswordChange, setIsManualPasswordChange] = useState(false);
  const [showLicensePopup, setShowLicensePopup] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const response = await performLogin('web', empNo, empPwd, navigate, (error) => {
      errorMsgPopup(error);
    });

    if (response && response.data.user.pwdChgYn === 'Y') {
      setIsManualPasswordChange(false);
      msgPopup("기간이 만료되어 비밀번호를 변경해야 합니다.");
      setShowPasswordChangePopup(true);
    }
  };

  const handleMobileLoginRedirect = () => {
    navigate('/mobile/Login');
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
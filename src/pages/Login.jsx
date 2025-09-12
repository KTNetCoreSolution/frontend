import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { performLogin, fetchCaptcha } from '../service/login';
import styles from './Login.module.css';
import Join from '../pages/user/Join';
import PasswordChange from '../pages/user/PasswordChange';
import { msgPopup } from '../utils/msgPopup';
import { errorMsgPopup } from '../utils/errorMsgPopup';
import LicensePopup from '../components/popup/LicensePopup'
import useStore from '../store/store';
import logoColorImg from '../assets/images/logo_color.png';
import loginMainImg from '../assets/images/loginmainImg.svg';
import loginUserImg from '../assets/images/icon_user.svg';
import loginPwImg from '../assets/images/icon_pw.svg';

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
  const { setClientVersion } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setTimeout(() => loadCaptcha(), 0);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
      setTimeout(() => {
        setCaptchaImage(captchaUrl);
        setTimer(60);
        setIsCaptchaLoading(false);
      }, 0);
    } catch (error) {
      console.error('캡챠 로드 실패, 재시도 남음:', retryCount - 1, error.message);
      setTimeout(() => loadCaptcha(retryCount - 1), 1000);
    }
  };

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
      msgPopup("최초 비밀번호나 기간만료로 인해 비밀번호를 변경해야 합니다.");
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

  const handleJoinClick = () => setShowJoinPopup(true);
  const handleLicenseClick = () => setShowLicensePopup(true);
  const handlePasswordChangeClick = () => {
    setIsManualPasswordChange(true);
    setShowPasswordChangePopup(true);
  };

  return (
    <div className='loginWrapper'>
      <div className='loginWrap'>
        <div 
          className='loginimgWrap'
          style={{
            background: `#EFFFFC url(${loginMainImg}) right 30px bottom 40px / 180px 112px no-repeat`,
          }}
        >
          <p
            className="logoImg"
            style={{
              background: `url(${logoColorImg}) left top / 122px 25px no-repeat`,
            }}
          ></p>
          <div className='txtWrap'>
            <p className='desc'>대한민국<br />ICT 인프라 운영/관리 전문기업</p>
            <p className='name'>케이티넷코어</p>
          </div>
        </div>
        <div className='loginContainer'>
          <p className='title'>Login<span>...</span></p>
          <form onSubmit={handleLogin}>
            <div className='formGroup'>
              <div className="inputWrapper">
                <img src={loginUserImg} alt="user 이미지" className="inputIcon" />
                <input
                  id="userid"
                  type="text"
                  value={empNo}
                  onChange={(e) => setEmpNo(e.target.value)}
                  placeholder="아이디를 입력하세요"
                  required
                  className="inputWithIcon"
                />
              </div>
            </div>
            <div className='formGroup'>
              <div className="inputWrapper">
                <img src={loginPwImg} alt="pw 이미지" className="inputIcon" />
                <input
                  id="password"
                  type="password"
                  value={empPwd}
                  onChange={(e) => setEmpPwd(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  required
                  className="inputWithIcon"
                />
              </div>
            </div>
            <div className='formGroup'>
              <div className='captchaContainer'>
                {captchaImage ? (
                  <img src={captchaImage} alt="CAPTCHA" className='captchaImage' />
                ) : (
                  <div className='captchaPlaceholder'>
                    {isCaptchaLoading ? 'Loading CAPTCHA...' : captchaError || '캡챠 로드 실패'}
                  </div>
                )}
                <div className='d-flex align-items-center'>
                  <span className='captchaTimer'>{timer}초</span>
                  <button type="button" className='btn btn-secondary' onClick={loadCaptcha}>
                    <i className="bi bi-arrow-repeat"></i>
                  </button>
                </div>
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
            <div className='buttonGroup'>
              <div className='buttonEtcWrap'>
                <div className='buttonEtcInnerWrap'>
                  <button type="button" className='smallButton' style={{ visibility: 'hidden' }} onClick={handleJoinClick}>
                    회원가입
                  </button>
                  <button type="button" className='smallButton' onClick={handlePasswordChangeClick}>
                    비밀번호 변경
                  </button>
                </div>
                <button type="button" className='smallButton info' onClick={handleLicenseClick}>
                  <i className="bi bi-info-circle"></i>
                </button>
              </div>
              <button type="submit" className='LoginButton'>
                로그인
              </button>
              {isLocal && (
                <button type="button" className='LoginButton' onClick={handleMobileLoginRedirect}>
                  <i className="bi bi-phone"></i> 모바일로그인으로 이동
                </button>
              )}
            </div>
          </form>
          <Join show={showJoinPopup} onHide={() => setShowJoinPopup(false)} gubun="web" />
          <PasswordChange
            show={showPasswordChangePopup}
            onHide={() => setShowPasswordChangePopup(false)}
            initialEmpNo={empNo}
            isEditable={isManualPasswordChange}
            gubun="web"
          />
          <LicensePopup show={showLicensePopup} onHide={() => setShowLicensePopup(false)} />
        </div>
      </div>
    </div>
  );
};

export default Login;
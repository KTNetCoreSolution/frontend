import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { performMobileLogin, fetchCaptcha, performMobileLoginAccess } from '../../service/login';
import Join from '../../pages/user/Join';
import PasswordChange from '../../pages/user/PasswordChange';
import { msgPopup } from '../../utils/msgPopup';
import { errorMsgPopup } from '../../utils/errorMsgPopup';
import LicensePopup from '../../components/popup/LicensePopup';
import styles from './MobileLogin.module.css';
import logoMainImgM from '../../assets/images/loginmainImg_m.png';
import loginUserImg from '../../assets/images/icon_user.svg';
import loginPwImg from '../../assets/images/icon_pw.svg';

const MobileLogin = () => {
  const isLocal = import.meta.env.VITE_ENV === 'local';
  const [empNo, setEmpNo] = useState(isLocal ? 'admin' : '');
  const [empPwd, setEmpPwd] = useState(isLocal ? 'new1234!' : '');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaImage, setCaptchaImage] = useState(null);
  const [timer, setTimer] = useState(60);
  const [isCaptchaLoading, setIsCaptchaLoading] = useState(true);
  const [captchaError, setCaptchaError] = useState('');
  const [accessCheckYn, setAccessCheckYn] = useState('N');
  const [accessAuthId, setAccessAuthId] = useState('');
  const [error, setError] = useState('');
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
          setTimeout(() => loadCaptcha(), 0);
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

  // 컴포넌트 마운트 시 캡챠 로드
  useEffect(() => {
    loadCaptcha();
  }, []);

  useEffect(() => {
    const initializeAccess = async () => {
      try {
        const response = await performMobileLoginAccess((error) => {
          errorMsgPopup(error);
          setError(error.message || '접근 권한 확인에 실패했습니다.');
        });

        if (response && response.success) {
          const accessAuthId = response.data[0].AUTHID;
          const accessCheckYn = response.data[0].ACCESSCHEKYN;

          setAccessAuthId(accessCheckYn === 'Y' ? accessAuthId : '');
          setAccessCheckYn(accessCheckYn);
        } else {
          setError(response?.errMsg || '접근 권한 확인에 실패했습니다.');
        }
      } catch (error) {
        console.error('초기 접근 권한 체크 실패:', error.message);
        setError(error.message || '접근 권한 확인에 실패했습니다.');
      }
    };
    initializeAccess();
  }, []); // 빈 의존성 배열로 한 번만 호출

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    const response = await performMobileLogin(accessAuthId, empNo, empPwd, captchaInput, navigate, (error) => {
      errorMsgPopup(error);
    });

    if (response && response.data.user.pwdChgYn === 'Y') {
      setIsManualPasswordChange(false);
      msgPopup("최초 비밀번호나 기간만료로 인해 비밀번호를 변경해야 합니다.");
      setShowPasswordChangePopup(true);
    }
  };

  const handleJoinClick = () => {
    setShowJoinPopup(true);
  };

  const handlePasswordChangeClick = () => {
    setIsManualPasswordChange(true);
    setShowPasswordChangePopup(true);
  };

  const handleLicenseClick = () => {
    setShowLicensePopup(true);
  };

  return (
    <div className='loginWrapper'>
      <p
        className="logoMainImg"
        style={{
          background: `url(${logoMainImgM}) center top / 140px 73px no-repeat`,
        }}
      ></p>
      <div className='loginContainer'>
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
              <img src={loginPwImg} alt="user 이미지" className="inputIcon" />
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
              className={styles.input}
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
              placeholder="코드를 입력하세요"
              required
            />
          </div>
          <div className='buttonGroup'>
            <div className='buttonEtcWrap'>
              <div className='buttonEtcInnerWrap'>
                <button
                  type="button"
                  className='smallButton'
                  style={{ visibility: 'hidden' }}
                  onClick={handleJoinClick}
                >
                  회원가입
                </button>
                <button
                  type="button"
                  className='smallButton'
                  onClick={handlePasswordChangeClick}
                >
                  비밀번호 변경
                </button>
              </div>
              <button
                type="button"
                className='smallButton info'
                onClick={handleLicenseClick}
              >
                <i className="bi bi-info-circle"></i>
              </button>
            </div>
            <button type="submit" className='LoginButton'>
              로그인
            </button>
          </div>
          {error && <p className={styles.error}>{error}</p>}
        </form>
        <Join show={showJoinPopup} onHide={() => setShowJoinPopup(false)} gubun="mobile"/>
        <PasswordChange
          show={showPasswordChangePopup}
          onHide={() => setShowPasswordChangePopup(false)}
          initialEmpNo={empNo}
          isEditable={isManualPasswordChange}
          gubun="mobile"
        />
        <LicensePopup
          show={showLicensePopup}
          onHide={() => setShowLicensePopup(false)}
        />
      </div>
    </div> 
  );
};

export default MobileLogin;
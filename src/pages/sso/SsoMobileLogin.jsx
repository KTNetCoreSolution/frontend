import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { performSsoLogin } from '../../service/login';
import { errorMsgPopup } from '../../utils/errorMsgPopup';

const SsoMobileLogin = ({ setIsLoading }) => {
  const navigate = useNavigate();
  const [isLoading, setLocalIsLoading] = useState(false);

  const ssoLogin = async () => {
    if (isLoading) return;
    setLocalIsLoading(true);
    setIsLoading(true);

    const isSsoMobileTest = window.location.pathname.includes('/ssoMobileTest');

    try {
      const urlParams = new URLSearchParams(window.location.search);
      let token = urlParams.get('token');

      if (!token && !isSsoMobileTest) {
        errorMsgPopup('토큰이 존재하지 않습니다.');
        setTimeout(() => navigate('/mobile/Login'), 3000);
        return;
      }

      console.log('token: ' + token);

      // token을 URL 인코딩
      const encodedToken = encodeURIComponent(token);
      console.log('encodedToken: ' + encodedToken);

      const params = {
        token: token,
        test: isSsoMobileTest ? 'Y' : 'N'
      };

      const result = await performSsoLogin('mobile', params, navigate);
      if (!result.success && !isSsoMobileTest) {
        errorMsgPopup(result.errMsg || '로그인에 실패했습니다.');
        setTimeout(() => navigate('/mobile/Login'), 3000);
      }
    } catch (err) {
      console.error('SSO 로그인 오류:', err);
      if (!isSsoMobileTest) {
        errorMsgPopup(err.message || '로그인에 실패했습니다.');
        setTimeout(() => navigate('/mobile/Login'), 3000);
      }
    } finally {
      setLocalIsLoading(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    ssoLogin();
  }, []);

  const handleButtonClick = () => {
    ssoLogin();
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p>{isLoading ? 'SSO 로그인 처리 중입니다...' : 'SSO 로그인'}</p>
      <button
        onClick={handleButtonClick}
        disabled={isLoading}
        style={{
          padding: '10px 20px',
          backgroundColor: isLoading ? '#ccc' : '#007bff',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
        }}
      >
        {isLoading ? '처리 중...' : 'SSO 로그인 재시도'}
      </button>
    </div>
  );
};

export default SsoMobileLogin;
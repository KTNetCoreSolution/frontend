import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { performSsoLogin } from '../../service/login';
import { errorMsgPopup } from '../../utils/errorMsgPopup';

const SsoMobileLogin = () => {
  const navigate = useNavigate();
  const [hasTriedLogin, setHasTriedLogin] = React.useState(false);

  const ssoLogin = async () => {
    if (hasTriedLogin) return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      let token = urlParams.get('token');

      /*
      if (token) {
        try {
          token = decodeURIComponent(token);
        } catch (e) {
          alert('토큰 디코딩 오류:', e);
        }
      } else {
        alert('토큰이 존재하지 않습니다.');
      }*/
     
      if (!token) {
        alert('토큰이 존재하지 않습니다.')
        setTimeout(() => navigate('/mobile/Login'), 3000);
        return;
      }
      
      const params = {
        token: token
      };
      const result = await performSsoLogin('mobile', params, navigate);
      if (!result.success) {
        alert(result.errMsg);
        setTimeout(() => navigate('/mobile/Login'), 3000);
      }
    } catch (err) {
      console.error('SSO 로그인 오류:', err);
      alert(err.message || '로그인에 실패했습니다.');
      setTimeout(() => navigate('/mobile/Login'), 3000);
    } finally {
      setHasTriedLogin(true);
    }
  };

  useEffect(() => {
    ssoLogin();
  }, []);

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p>SSO 로그인 처리 중입니다...</p>
    </div>
  );
};

export default SsoMobileLogin;
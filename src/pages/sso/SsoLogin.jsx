import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { performQPortalSsoLogin, performMakeQPortalToken } from '../../service/login';
import { errorMsgPopup } from '../../utils/errorMsgPopup';
import useStore from '../../store/store';

const SsoLogin = ({ setIsLoading }) => {
  const navigate = useNavigate();
  const [isLoading, setLocalIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { user, setUser, clearUser } = useStore();

  const ssoLogin = async () => {
    if (isLoading) return;
    setLocalIsLoading(true);
    if (setIsLoading) setIsLoading(true); // setIsLoading이 있을 때만 호출

    try {
      const urlParams = new URLSearchParams(window.location.search);
      let token = urlParams.get('sso_token'); // ssoToken 파라미터 추가

      if (!token || token.trim() === '') {
        alert('토큰이 존재하지 않습니다.');
        navigate('/', { replace: true });
        return;
      }

      // token을 URL 인코딩
      const encodedToken = encodeURIComponent(token);

      const params = {
        ssoToken: token,
        empNo: empNo,
      };

      const result = await performQPortalSsoLogin(params, navigate);
      
      if (!result.success) {
        const errMsg = result.errMsg || '로그인에 실패했습니다.';
        setErrorMsg(errMsg);
        navigate('/', { replace: true });
      } else {
        // 에러가 없으면 setUser 호출 및 네비게이트
        setUser({
          ...result.data.user,
          expiresAt: result.data.expiresAt * 1000,
        });
        navigate('/main', { replace: true });
      }
    } catch (err) {
      console.error('SSO 로그인 오류:', err);
      const errMsg = err.message || '로그인에 실패했습니다.';
      setErrorMsg(errMsg);
      navigate('/', { replace: true });
    } finally {
      setLocalIsLoading(false);
      if (setIsLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    ssoLogin();
  }, []);

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p>{isLoading ? 'SSO 로그인 처리 중입니다...' : errorMsg || 'SSO 로그인'}</p>
    </div>
  );
};

export default SsoLogin;
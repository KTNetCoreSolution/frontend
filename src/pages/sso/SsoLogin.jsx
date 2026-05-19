import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { performSsoLogin, performMobileSsoLoginAccess } from '../../service/login';
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

    const isSsoMobileTest = window.location.pathname.includes('/ssoMobileTest');

    try {
      const urlParams = new URLSearchParams(window.location.search);
      let token = urlParams.get('token');

      if (!token && !isSsoMobileTest) {
        alert('토큰이 존재하지 않습니다.');
        navigate('/', { replace: true });
        return;
      }

      // token을 URL 인코딩
      const encodedToken = encodeURIComponent(token);

      const params = {
        token: token,
        test: isSsoMobileTest ? 'Y' : 'N'
      };

      const result = await performSsoLogin('mobile', params, navigate);
      if (!result.success && !isSsoMobileTest) {
        const errMsg = result.errMsg || '로그인에 실패했습니다.';
        setErrorMsg(errMsg);
        alert(errMsg);
        navigate('/', { replace: true });
      } else {
        const accessResponse = await performMobileSsoLoginAccess(result.data.user.empNo, (error) => {
          const errMsg = error || '접근권한이 없습니다.';
          setErrorMsg(errMsg);
        });

        // 모든 에러 판단 로직
        let hasError = false;
        let errMsg = '';

        if (!accessResponse.success) {
          hasError = true;
          errMsg = accessResponse.errMsg || '접근권한이 없습니다.';
        } else if (accessResponse.errMsg !== '' || (accessResponse.data?.[0]?.errCd && accessResponse.data[0].errCd !== '00')) {
          hasError = true;
          errMsg = accessResponse.data?.[0]?.errMsg || accessResponse.errMsg || '접근권한이 없습니다.';
        } else {
          // 에러가 없으면 setUser 호출 및 네비게이트
          setUser({
            ...result.data.user,
            expiresAt: result.data.expiresAt * 1000,
          });
          navigate('/main', { replace: true });
        }

        if (hasError) {
          alert(errMsg); // 이미 콜백에서 호출되었지만 보장
          // errorMsgPopup(errMsg);
          navigate('/', { replace: true });
        }
      }
    } catch (err) {
      console.error('SSO 로그인 오류:', err);
      if (!isSsoMobileTest) {
        const errMsg = err.message || '로그인에 실패했습니다.';
        setErrorMsg(errMsg);
        alert(errMsg);
      }
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
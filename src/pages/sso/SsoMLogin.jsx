import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { performSsoLoginCheck } from '../../service/login'; 
import { errorMsgPopup } from '../../utils/errorMsgPopup';

const SsoMLogin = () => {  // 컴포넌트 이름 SsoMLogin으로 가정 (요청하신 대로)
  const navigate = useNavigate();
  const location = useLocation();  // URL 쿼리 파싱용
  const [isLoading, setLocalIsLoading] = useState(false);

  const ssoLoginCheck = async () => {
    if (isLoading) return;
    setLocalIsLoading(true);

    try {
      const urlParams = new URLSearchParams(location.search);  // 쿼리 파싱
      const empNo = urlParams.get('empNo');

      if (!empNo) {
        errorMsgPopup('empNo가 존재하지 않습니다.');
        setTimeout(() => navigate('/mobile/Login'), 3000);
        return;
      }

      const params = {
        empNo: empNo,
        ssoCheck: 'Y'  // 요청하신 대로 Y 값 고정
      };

      // performSsoLogin을 check 용으로 호출 (login.js에서 sso/login/check로 변경 필요)
      const result = await performSsoLoginCheck('mobile', params, navigate);  // 경로를 'auth/sso/login/check'로 내부에서 변경
      if (!result.success) {
        errorMsgPopup(result.errMsg || '로그인 체크 실패');
        setTimeout(() => navigate('/mobile/Login'), 3000);
      }
      // 성공 시 performSsoLogin 내부에서 이미 /mobile/main으로 navigate 함
    } catch (err) {
      console.error('SSO 로그인 체크 오류:', err);
      errorMsgPopup(err.message || '로그인에 실패했습니다.');
      setTimeout(() => navigate('/mobile/Login'), 3000);
    } finally {
      setLocalIsLoading(false);
    }
  };

  useEffect(() => {
    ssoLoginCheck();
  }, []);

  // ... 버튼 등 UI 유지 ...
};

export default SsoMLogin;
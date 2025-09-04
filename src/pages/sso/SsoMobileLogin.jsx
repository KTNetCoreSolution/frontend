import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { performSsoLogin } from '../../service/login';
import { errorMsgPopup } from '../../utils/errorMsgPopup';
import { fetchDataGet } from '../../utils/dataUtils';

const MKATE_URL = import.meta.env.VITE_MKATE_URL || '';
let msg = '';

const SsoMobileLogin = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const ssoLogin = async () => {
      try {
        // URL 쿼리 파라미터에서 token 읽기
        const urlParams = new URLSearchParams(window.location.search);
        alert(urlParams);
        const token = urlParams.get('token');

        alert('token:' + token);
        if (!token) {
          msg = '토큰이 존재하지 않습니다.';
          errorMsgPopup(msg);
          throw new Error(msg);
        }

        const params = {
          token: token
        };

        alert('fetchDataGet params:' + params);

        alert('MKATE_URL:' + MKATE_URL);

        const res = await fetchDataGet(MKATE_URL, params, { withCredentials: false }, 'Y');
        if (!res || !res.result) {
          msg = 'SSO 응답 형식 오류';

          alert('msg');
          errorMsgPopup(msg);
          throw new Error(msg);
        }

        alert('res.result:' + res.result);

        if (res.result.code !== '0') {
          msg = res.result.errdesc || '응답 결과 오류';
          errorMsgPopup(msg);
          throw new Error(msg);
        }

        const userid = res.userid;
        if (!userid) {
          msg = 'userid 값이 없습니다.';
          errorMsgPopup(msg);
          throw new Error(msg);
        }

        await performSsoLogin(
          'mobile',
          userid,
          navigate,
          (err) => errorMsgPopup(err)
        );

      } catch (err) {
        console.error('SSO 로그인 오류:', err);
      }
    };

    ssoLogin();
  }, [navigate]);

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p>SSO 로그인 처리 중입니다...</p>
    </div>
  );
};

export default SsoMobileLogin;

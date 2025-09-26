import { fetchData, fetchPromiseData } from '../utils/dataUtils';
import useStore from '../store/store';

export const performLogin = async (gubun, empNo, empPwd, captchaInput, navigate, setError) => {
  try {
    
    const response = await fetchData('auth/login', { empNo, empPwd, captchaInput }, {}, 'N', false);
    
    if (!response.success) {
      throw new Error(response.errMsg || '아이디, 비밀번호 또는 캡챠가 잘못되었습니다.');
    } else {
      if (response.errMsg !== '') {
        setError(response.errMsg);
      } else {
        if (response.data.user.pwdChgYn === 'Y') {
          return response;
        }

        const { setUser } = useStore.getState();
        setUser({
          ...response.data.user,
          expiresAt: response.data.expiresAt * 1000,
        });

        if (gubun === 'web') navigate('/main', { replace: true });
        else navigate('/mobile/main', { replace: true });
      }
    }
  } catch (error) {
    console.error('Login error:', error.message);
    setError(error.message || '로그인에 실패했습니다. 다시 시도해주세요.');
  }
  return null;
};

export const performMobileLogin = async (accessAuthId, empNo, empPwd, captchaInput, navigate, setError) => {
  try {
    const response = await fetchData('auth/login', { empNo, empPwd, captchaInput }, {}, 'N', false);

    if (!response.success) {
      setError(response.errMsg || '아이디, 비밀번호 또는 캡챠가 잘못되었습니다.');
      return null;
    } else {
      if (response.errMsg !== '') {
        setError(response.errMsg);
        return null;
      } else {
        // 접근권한 체크
        if (accessAuthId !== '') {
          if (accessAuthId !== response.data.user.auth) {
            setError('접근권한이 없습니다.');
            return null;
          }
        }

        // 비밀번호 변경 필요 시 response 반환
        if (response.data.user.pwdChgYn === 'Y') {
          setError(''); // 에러 메시지 클리어
          return response;
        }

        // 로그인 성공 및 상태 업데이트
        const { setUser } = useStore.getState();
        setUser({
          ...response.data.user,
          expiresAt: response.data.expiresAt * 1000,
        });

        navigate('/mobile/main', { replace: true });
        setError(''); // 에러 메시지 클리어
        return response;
      }
    }
  } catch (error) {
    console.error('Login error:', error.message);
    setError(error.message || '로그인에 실패했습니다. 다시 시도해주세요.');
    return null;
  }
};

export const performMobileLoginAccess = async (setError) => {
  let response = null;

  try {

    const params = {
        pGUBUN: 'LIST',
        pDEBUG: 'F',
    };
    
    response = await fetchData('auth/mLogin/access/list', params, {}, 'N', false);
    
    if (!response.success) {
      throw new Error(response.errMsg || '접근권한이 없습니다.');
    } else {
      if (response.errMsg !== '') {
        setError(response.errMsg);
      } 

    }
  } catch (error) {
    console.error('Login error:', error.message);
    setError(error.message || '접근권한이 없습니다.');
  }
  return response;
};

export const performMobileSsoLoginAccess = (empNo, setError) => {
  return fetchPromiseData('auth/mLogin/sso/access/list', { pEMPNO: empNo }, {}, 'N', false)
    .then(response => {
      if (!response.success) {
        const errMsg = response.errMsg || '접근권한이 없습니다.';
        setError(errMsg);
        return response;
      } else {
        if (response.errMsg !== '' || (response.data?.[0]?.errCd && response.data[0].errCd !== '00')) {
          const errMsg = response.data?.[0]?.errMsg || response.errMsg || '접근권한이 없습니다.';
          setError(errMsg);
        }
        return response;
      }
    })
    .catch(error => {
      const errMsg = error.message || '접근권한이 없습니다.';
      console.error('Login error:', errMsg);
      setError(errMsg);
      return { success: false, errMsg }; // 최소한의 에러 정보 반환
    });
};
/*
export const performSsoLogin = async (gubun, params, navigate) => {
  try {
    const response = await fetchData('auth/sso/login', params, {}, 'N', false);
    if (!response.success) {
      throw new Error(response.errMsg || 'SSO 로그인 오류');
    } else if (response.errMsg !== '') {
      return { success: false, errMsg: response.errMsg };
    } else {
      if (response.data.user.pwdChgYn === 'Y') {
        return response;
      }
      const { setUser } = useStore.getState();
      setUser({
        ...response.data.user,
        expiresAt: response.data.expiresAt * 1000,
      });
      navigate(gubun === 'web' ? '/main' : '/mobile/main', { replace: true });
      return { success: true };
    }
  } catch (error) {
    console.error('Login error:', error.message);
    return { success: false, errMsg: error.message || '로그인에 실패했습니다. 다시 시도해주세요.' };
  }
};
*/

export const performSsoLogin = (gubun, params, navigate) => {
  return fetchPromiseData('auth/sso/login', params, {}, 'N', false)
    .then(response => {
     if (!response.success) {
        throw new Error(response.errMsg || 'SSO 로그인 오류');
      } else if (response.errMsg !== '') {
        return { success: false, errMsg: response.errMsg };
      } else {
        return { success: true, data: response.data };
      }
    })
    .catch(error => {
      console.error('Login error:', error.message);
      return { success: false, errMsg: error.message || '로그인에 실패했습니다. 다시 시도해주세요.' };
    });
};

export const performSsoLoginCheck = (gubun, params, navigate) => {
  return fetchPromiseData('auth/sso/login/check', params, {}, 'N', false)
    .then(response => {
      if (!response.success) {
        throw new Error(response.errMsg || 'SSO 로그인 체크 오류');
      } else if (response.errMsg !== '') {
        return { success: false, errMsg: response.errMsg };
      } else {
        // if (response.data.user.pwdChgYn === 'Y') {
        //   return response;
        // }
        const { setUser } = useStore.getState();
        setUser({
          ...response.data.user,
          expiresAt: response.data.expiresAt * 1000,
        });
        navigate(gubun === 'web' ? '/main' : '/mobile/main', { replace: true });
        return { success: true };
      }
    })
    .catch(error => {
      console.error('Login check error:', error.message);
      return { success: false, errMsg: error.message || '로그인 체크에 실패했습니다.' };
    });
};

export const fetchCaptcha = async () => {
  try {
    const config = {
      responseType: 'blob', // Handle binary data for image
      headers: {
        'Accept': 'image/png',
      },
      withCredentials: true, // Include credentials for session
    };
    
    const response = await fetchData('auth/captcha', {}, config, 'N', false);
    // Check if response is an image
    if (response.type !== 'image/png') {
      // Read JSON error response
      const text = await response.text();
      const errorData = JSON.parse(text);
      throw new Error(errorData.message || '캡챠 이미지를 불러오는데 실패했습니다.');
    }
    return URL.createObjectURL(response);
  } catch (error) {
    console.error('캡챠 이미지 가져오기 실패:', error.message);
    throw new Error(error.message || '캡챠 이미지를 불러오는데 실패했습니다.');
  }
};
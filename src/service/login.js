import { fetchData } from '../utils/dataUtils';
import useStore from '../store/store';

export const performLogin = async (gubun, empNo, empPwd, navigate, setError) => {
  try {
    const response = await fetchData('auth/login', { empNo, empPwd });
    
    if (!response.success) {
      throw new Error(response.errMsg || '아이디 또는 비밀번호가 잘못되었습니다.');
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
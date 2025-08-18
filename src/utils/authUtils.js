import { fetchData, fetchDataGet } from './dataUtils';
import useStore from '../store/store';

const DEFAULT_READ_PERMISSIONS = ['AUTH0001', 'AUTH0002', 'AUTH0003', 'AUTH0004', 'AUTH0005', 'AUTH0006', 'AUTH0007', 'AUTH0008', 'AUTH0009', '', null];

const PERMISSION_MAP = {
  main: ['AUTH0001', 'AUTH0002', 'AUTH0003', 'AUTH0004', '', null],
  mainhome: ['AUTH0001', 'AUTH0002', 'AUTH0003', 'AUTH0004', 'AUTH0005', 'AUTH0006', 'AUTH0007', 'AUTH0008', 'AUTH0009', '', null],
  oper: ['AUTH0001', 'AUTH0002', 'AUTH0003', 'AUTH0004', '', null],
  mainBoard: ['AUTH0001', 'AUTH0002', 'AUTH0003', 'AUTH0004', '', null],
  permissions: ['AUTH0001'],
  tabulatorDirect: ['AUTH0001', 'AUTH0002', 'AUTH0003', 'AUTH0004', '', null],
};

export function hasPermission(userAuth, screen) {
  if (!userAuth || !screen) return false;
  const allowedAuths = PERMISSION_MAP[screen] || DEFAULT_READ_PERMISSIONS;
  return allowedAuths.includes(userAuth);
}

export async function checkTokenValidity(navigate, user, setUser, clearUser) {
  try {
    const response = await fetchDataGet('auth/live', { extend: true }, { withCredentials: true });
    if (response.success) {
      setUser({
        ...user,
        expiresAt: response.data.expiresAt * 1000,
      });
      return true;
    } else {
      throw new Error(response.errMsg || 'Token validation failed');
    }
  } catch (error) {
    console.error('Token validation failed:', error.message);
    clearUser();
    navigate('/', { replace: true });
    return false;
  }
}

export const checkTokenValiditySimple = async (clearUser) => {
  try {
    const response = await fetchDataGet('auth/check', {}, { withCredentials: true }, 'N');
    if (response.success && response.data) {
      return true;
    } else {
      clearUser();
      sessionStorage.removeItem('user-storage');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('menu');
      return false;
    }
  } catch (error) {
    console.error('authUtils.js: checkTokenValiditySimple failed:', error.response?.status, error.response?.data);
    if (error.response?.status === 418) {

      return false;
    } else if (error.response?.status === 401) {
      clearUser();
      sessionStorage.removeItem('user-storage');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('menu');
      return false;
    }
    throw error;
  }
};
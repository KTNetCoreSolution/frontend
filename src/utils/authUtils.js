import { fetchDataGet } from './dataUtils';

// Default read permissions for all pages
const DEFAULT_READ_PERMISSIONS = ['AUTH0001', 'AUTH0002', 'AUTH0003', 'AUTH0004', 'AUTH0005', 'AUTH0006', 'AUTH0007', '', null];

// Specific permissions for write actions or restricted routes
const PERMISSION_MAP = {
  main: ['AUTH0001', 'AUTH0002', 'AUTH0003', '', null],
  mainhome: ['AUTH0001', 'AUTH0002', 'AUTH0003', '', null],
  oper: ['AUTH0001', 'AUTH0002', 'AUTH0003', '', null],
  mainBoard: ['AUTH0001', 'AUTH0002', 'AUTH0003', '', null],
  permissions: ['AUTH0001'],
  test1: ['AUTH0001', 'AUTH0002', 'AUTH0003', '', null],
  tabulatorDirect: ['AUTH0001', 'AUTH0002', 'AUTH0003', '', null],
};

export function hasPermission(userAuth, screen) {
  if (!userAuth || !screen) return false;
  const allowedAuths = PERMISSION_MAP[screen] || DEFAULT_READ_PERMISSIONS;
  return allowedAuths.includes(userAuth);
}

export async function checkTokenValidity(navigate, user, setUser, clearUser) {
  try {
    const response = await fetchDataGet('auth/live', { extend: true } );

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

export async function checkTokenValiditySimple(clearUser) {
  try {
    const response = await fetchDataGet('auth/check', {} );
    return response.success;
  } catch (error) {
    console.error('Simple token check failed:', error.message);
    clearUser();
    return false;
  }
}
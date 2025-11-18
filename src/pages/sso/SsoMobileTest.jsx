import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SsoMobileLogin from './SsoMobileLogin';
import { errorMsgPopup } from '../../utils/errorMsgPopup';
import { fetchDataGet } from '../../utils/dataUtils';

const FIXED_TOKEN = ''; //테스트 토큰값을 넣는다.

const SsoMobileTest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [fixedToken, setFixedToken] = useState(FIXED_TOKEN);
  const [incomingToken, setIncomingToken] = useState('');
  const [corpFlag, setCorpFlag] = useState('1'); // .NET 참조: 기본값 KT
  const [showSsoLogin, setShowSsoLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // URL에서 외부 토큰 가져오기
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const token = urlParams.get('token');
    if (token) {
      setIncomingToken(token);
    } else {
      setIncomingToken('');
    }
  }, [location.search]);

  // 기존 폼 제출 핸들러
  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setShowSsoLogin(true);

    try {
      const encodedToken = encodeURIComponent(fixedToken);
      navigate(`?token=${encodedToken}`, { replace: true });
    } catch (e) {
      errorMsgPopup('토큰 인코딩 오류: ' + e.message);
      setIsLoading(false);
    }
  };

  // 추가: Spring Boot 호출 시뮬레이션
  const handleSpringBootCall = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const params = {
        token: fixedToken,
        test: 'Y', // 테스트 모드
        corpFlag: corpFlag // .NET 참조
      };

      const response = await fetchDataGet('mobile/ssoMLogin', params, {}, 'N', false);
      if (!response.success) {
        errorMsgPopup(response.errMsg || 'Spring Boot 호출 실패');
      } else {
        setShowSsoLogin(true); // 성공 시 SsoMobileLogin 표시
      }
    } catch (err) {
      errorMsgPopup('Spring Boot 호출 오류: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container-fluid min-vh-100 py-4">
      <div className="row">
        {/* 왼쪽: 텍스트박스 그룹 */}
        <div className="col-md-6 p-4">
          <h2 className="mb-4">SSO 로그인 테스트</h2>

          {/* 고정 토큰 입력 폼 */}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="fixedToken" className="form-label">고정 토큰</label>
              <textarea
                className="form-control"
                id="fixedToken"
                rows="4"
                value={fixedToken}
                onChange={(e) => setFixedToken(e.target.value)}
                required
              />
            </div>
            {/* 추가: corpFlag 입력 */}
            <div className="mb-3">
              <label htmlFor="corpFlag" className="form-label">corpFlag (1: KT, 기타: 그룹사)</label>
              <input
                className="form-control"
                id="corpFlag"
                value={corpFlag}
                onChange={(e) => setCorpFlag(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
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
              {isLoading ? '처리 중...' : 'SSO 로그인 호출'}
            </button>
            {/* 추가: Spring Boot 호출 버튼 */}
            <button
              type="button"
              onClick={handleSpringBootCall}
              className="btn btn-secondary mt-3"
              disabled={isLoading}
              style={{
                padding: '10px 20px',
                backgroundColor: isLoading ? '#ccc' : '#6c757d',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? '처리 중...' : 'Spring Boot SSO 호출 시뮬'}
            </button>
          </form>

          {/* 외부에서 받은 토큰 표시 */}
          <div className="mb-3 mt-3">
            <label htmlFor="incomingToken" className="form-label">외부에서 받은 토큰</label>
            <textarea
              className="form-control"
              id="incomingToken"
              rows="4"
              value={incomingToken}
              readOnly
            />
          </div>
        </div>

        {/* 오른쪽: SsoMobileLogin 컴포넌트 */}
        <div className="col-md-6 p-4">
          {showSsoLogin && (
            <div className="card">
              <div className="card-body">
                <SsoMobileLogin navigate={navigate} setIsLoading={setIsLoading} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SsoMobileTest;
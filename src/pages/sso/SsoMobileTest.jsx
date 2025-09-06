import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SsoMobileLogin from './SsoMobileLogin';
import { errorMsgPopup } from '../../utils/errorMsgPopup';

const FIXED_TOKEN = 'MzIwMWVzawAAAAEAN+8aB2Jh4wuoOij1Ex9uCk7zthAG8OziOxXpNr/TPPKN1PBLUg6otvE2BMmbQ7Ph2dRd4YODr4F03BGlU8lFpcjpqzH4GTBUD6wz+mIMZ3piDSmrj4vjakH1frafSxj/Gl1C3Z3CH3CubT9XOpNnpCycczfPt82p5HY1NpwjKTuP/UZaEVF1WY+xhWjqPW0JoDt1x04THIedN9L9ODgUPAtcy+gUApI+redME7UXGzeSV1s5J/MOZssBwVoW91t3//9Jsp4ycpePBC77qvTK+eqfT8Bb14S8kLs9aZqB5yQcAippv0MSTNswlv93GzFtM8/TUHz8U4LmQoeh/YRW+WVuZHQAAABQHMK+37FoIxZStFs3ClMVO95lc1lwCf5Erv+DmxulRBWseCcL19VXQxrdLqUhmtHbhZ9muV8Sx5pKod8+tUuE6KGPp64BAW4/zI9Qz0SOmHo=';

const SsoMobileTest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [fixedToken, setFixedToken] = useState(FIXED_TOKEN);
  const [incomingToken, setIncomingToken] = useState('');
  const [showSsoLogin, setShowSsoLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // URL에서 외부 토큰 가져오기
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const token = urlParams.get('token');
    if (token) {
      setIncomingToken(token); // 디코딩 제거, raw token 사용
    } else {
      setIncomingToken('');
    }
  }, [location.search]);

  // 폼 제출 핸들러
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
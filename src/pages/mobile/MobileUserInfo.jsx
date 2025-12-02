import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileMainUserMenu from '../../components/mobile/MobileMainUserMenu';
import useStore from '../../store/store';
import { fetchData } from "../../utils/dataUtils";
import { errorMsgPopup } from '../../utils/errorMsgPopup';
import { msgPopup } from "../../utils/msgPopup";
import api from '../../utils/api';
import common from '../../utils/common';
import styles from './MobileUserInfo.module.css';

const MobileUserInfo = () => {
  const navigate = useNavigate();
  const { user, clearUser } = useStore();
  const [showSidebar, setShowSidebar] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleToggleSidebar = () => setShowSidebar(prev => !prev);

  const handleLogout = async () => {
    try {
      const response = await api.post(commonUtils.getServerUrl('auth/logout'), {});
      if (response) {
        clearUser();
        navigate('/mobile/Login');
      }
    } catch (error) {
      console.error('Logout failed:', error.message);
      clearUser();
      navigate('/mobile/Login');
    }
  };

  useEffect(() => {
    const loadMyInfo = async () => {
      if (!user?.empNo) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const params = {
          pGUBUN: "EMPNO",
          pSEARCH: user.empNo,
          pDEBUG: "F"
        };

        const response = await fetchData("common/userinfo/list", params);

        if (!response.success || response.errMsg !== "") {
          errorMsgPopup(response.message || response.errMsg || "사용자 정보를 불러오지 못했습니다.");
          setUserInfo(null);
          return;
        }

        const data = Array.isArray(response.data) ? response.data[0] : null;
        if (data) {
          setUserInfo(data);
        } else {
          msgPopup("사용자 정보를 찾을 수 없습니다.");
        }
      } catch (err) {
        console.error(err);
        errorMsgPopup("정보를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    loadMyInfo();
  }, [user?.empNo]);

  // 각 항목을 개별 타일로 렌더링하는 함수
  const InfoTile = ({ label, value }) => (
    <div className={styles.infoTile}>
      <div className={styles.infoRow}>
        <span className={styles.infoLabel}>{label}</span>
        <span className={styles.infoValue}>{value || '-'}</span>
      </div>
    </div>
  );

  return (
    <div className="container-fluid p-0">
      {/* 헤더 */}
      <header className="header">
        <h1 className="h5 mb-0">나의 정보</h1>
        <button className="btn text-white" onClick={handleToggleSidebar}>
          <i className="bi bi-list"></i>
        </button>
      </header>

      <MobileMainUserMenu
        show={showSidebar}
        handleClose={handleToggleSidebar}
        onLogout={handleLogout}
      />

      {/* 본문 */}
      <div className="pageMain pt-3">
        {loading ? (
          <div className={styles.loadingWrapper}>
            <div className={styles.loadingSpinner}></div>
            <p>정보를 불러오는 중...</p>
          </div>
        ) : !userInfo ? (
          <div className={styles.noData}>
            사용자 정보를 불러올 수 없습니다.
          </div>
        ) : (
          <>
            <InfoTile label="사원번호" value={userInfo.EMPNO} />
            <InfoTile label="성명" value={userInfo.EMPNM} />
            <InfoTile label="소속" value={userInfo.ORGNM} />
            <InfoTile label="직책" value={userInfo.LEVELNM} />
            <InfoTile label="호칭" value={userInfo.TITLENM} />
            <InfoTile label="분야" value={userInfo.SECTIONNM} />
          </>
        )}
      </div>
    </div>
  );
};

export default MobileUserInfo;
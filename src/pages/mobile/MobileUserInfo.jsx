import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileMainUserMenu from '../../components/mobile/MobileMainUserMenu';
import useStore from '../../store/store';
import { fetchData } from "../../utils/dataUtils";
import { errorMsgPopup } from '../../utils/errorMsgPopup';
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
      await api.post(common.getServerUrl('auth/logout'), {});
      clearUser();
      navigate('/Mobile/Login');
    } catch (error) {
      clearUser();
      navigate('/Mobile/Login');
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
          errorMsgPopup(response.message || response.errMsg || "정보를 불러오지 못했습니다.");
          setUserInfo(null);
          return;
        }
        const data = Array.isArray(response.data) ? response.data[0] : null;
        setUserInfo(data);
      } catch (err) {
        console.error(err);
        errorMsgPopup("네트워크 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };
    loadMyInfo();
  }, [user?.empNo]);

  return (
    <div className="container-fluid p-0">
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

      <div className="pageMain pt-3">
        {loading ? (
          <div className={styles.loadingWrapper}>
            <div className={styles.loadingSpinner}></div>
            <p>정보 불러오는 중...</p>
          </div>
        ) : !userInfo ? (
          <div className={styles.noData}>
            사용자 정보를 찾을 수 없습니다.
          </div>
        ) : (
          <div className={styles.infoCard}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>사원번호</span>
              <span className={styles.infoValue}>{userInfo.EMPNO || '-'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>성명</span>
              <span className={styles.infoValue}>{userInfo.EMPNM || '-'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>소속</span>
              <span className={styles.infoValue}>{userInfo.ORGNM || '-'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>직책</span>
              <span className={styles.infoValue}>{userInfo.LEVELNM || '-'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>호칭</span>
              <span className={styles.infoValue}>{userInfo.TITLENM || '-'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>분야</span>
              <span className={styles.infoValue}>{userInfo.SECTIONNM || '-'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileUserInfo;
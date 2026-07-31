import React, { useState, useEffect, useRef } from 'react';
import useStore from '../../store/store.js';
import styles from '../../components/table/TableSearch.module.css';
import reportStyles from './ReportInfoList.module.css';
import { fetchData } from '../../utils/dataUtils.js';
import { hasPermission } from '../../utils/authUtils.js';
import { errorMsgPopup } from '../../utils/errorMsgPopup.js';
import { msgPopup } from '../../utils/msgPopup.js';
import { arEG, tr } from 'date-fns/locale';
import ReportInfoManage from './ReportInfoManage.jsx';

/**
 * 테이블 및 검색 기능 컴포넌트
 * @returns {JSX.Element} 검색 폼과 테이블을 포함한 컴포넌트
 */
const ReportInfoList = () => {
  const { user } = useStore();
  
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [selectedReportId, setSelectedReportId] = useState(null);

  useEffect(() => {
    const loadReportInfo = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = {
          pDEBUG: "F",
        };
        const response = await fetchData("report/infoList", params);
        
        if (response.success && Array.isArray(response.data)) {
          setData(response.data);
        } else {
          setError("데이터를 불러오는데 실패했습니다.");
        }
      } catch (err) {
        console.error('성과 REPORT 정보를 가져오는 중 오류 발생:', err);
        setError("데이터 조회 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    loadReportInfo();
  }, []);

  if (loading) return <div className={styles.container}>로딩 중...</div>;
  if (error) return <div className={styles.container}>{error}</div>;
    
  const fn_callReportDetail = (number, reportId) => {
    setSelectedNumber(number);
    setSelectedReportId(reportId);
  };

  // 목록으로 돌아가기
  const goBackToList = () => {
    setSelectedNumber(null);
    setSelectedReportId(null);
  };

  if (selectedReportId !== null) {
    return <ReportInfoManage reportId={selectedReportId} reportTitle={data.find(r => r.REPORTID === selectedReportId)?.TITLE} number={selectedNumber} onBack={goBackToList} />;
  }

  return (
      <div className={reportStyles.pageWrapper}>
        {/*<div className={reportStyles.headerBanner}>
          <div className={reportStyles.headerLeft}>
            <div className={reportStyles.iconCircle}>R</div>
            <div>
              <h1 className={reportStyles.headerTitle}>성과 REPORT 관리</h1>
              <p className={reportStyles.headerDesc}>
                등록된 성과 REPORT를 확인하고 세부 실적을 관리합니다.
              </p>
            </div>
          </div>
          <div className={reportStyles.totalBadge}>
            <span className={reportStyles.label}>전체</span>
            <span className={reportStyles.count}>{data.length}</span>
            <span className={reportStyles.label}>건</span>
          </div>
        </div>*/}
      {data.length === 0 ? (
        <p className={reportStyles.emptyText}>등록된 성과 Report 정보가 없습니다.</p>
      ) : (
        <div className={reportStyles.cardGrid}>
          {data.map((report, index) => {
            const number = String(index + 1).padStart(2, '0');

            return (
              <div key={report.REPORTID || index} className={reportStyles.card}>
                {/* 번호 */}
                <div className={reportStyles.cardNumber}>{number}</div>

                {/* 제목 */}
                <h2 className={reportStyles.cardTitle}>{report.TITLE}</h2>

                {/* 내용 */}
                <p className={reportStyles.cardContents}>{report.CONTENTS}</p>

                {/* 담당자 */}
                <div className={reportStyles.managerArea}>
                  <span className={reportStyles.managerLabel}>담당자</span>
                  <span className={reportStyles.managerName}>
                    {report.ORGNM} {report.EMPNM}
                  </span>
                </div>

                {/* 상세보기 */}
                <div className={reportStyles.detailLink} onClick={() => fn_callReportDetail(number, report.REPORTID)}>
                  상세보기
                </div>
              </div>
            );
          })}
        </div>
      )}
  </div>
  );
};

export default ReportInfoList;
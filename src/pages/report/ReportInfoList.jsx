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
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [selectedReportColor, setSelectedReportColor] = useState(null);
  const colors = [
    { className: 'navi', color: '#002b5f' },
    { className: 'blue', color: '#0078d4' },
    { className: 'green', color: '#107c10' },
    { className: 'orange', color: '#d83b01' }
  ];

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
    
  const fn_callReportDetail = (reportId) => {
    setSelectedReportId(reportId);
    const report = data.find(r => r.REPORTID === reportId);
    if (report) {
      const color = colors[data.indexOf(report) % colors.length];
      setSelectedReportColor(color.color);
    }
  };

  // 목록으로 돌아가기
  const goBackToList = () => {
    setSelectedReportId(null);
    setSelectedReportColor(null);
  };

  if (selectedReportId !== null) {
    return <ReportInfoManage reportId={selectedReportId} reportTitle={data.find(r => r.REPORTID === selectedReportId)?.TITLE} color={selectedReportColor} onBack={goBackToList} />;
  }

  return (
    <div className={styles.container}>
      {data.length === 0 ? (
        <p>등록된 성과 Report 정보가 없습니다.</p>
      ) : (
        data.map((report, index) => {
          const color = colors[index % colors.length];
          
          return (
            <div key={report.REPORTID || index} className={`card ${reportStyles.card}`} onClick={() => fn_callReportDetail(report.REPORTID)}>
              <div className={reportStyles.cardHeader}>
                <div className={reportStyles.title} style={{ backgroundColor: color.color }}>{report.TITLE}</div>
                <div className={reportStyles.date}>{report.RPTDATE}</div>
              </div>
              <div className={reportStyles.cardBody}>
                <div className={reportStyles.contents}>{report.CONTENTS}</div>
                <div className={reportStyles.mngempno}>
                  {report.ORGNM} {report.EMPNM}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default ReportInfoList;
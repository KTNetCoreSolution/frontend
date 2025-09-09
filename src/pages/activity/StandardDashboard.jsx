import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as echarts from 'echarts';
import useStore from '../../store/store';
import { fetchData } from '../../utils/dataUtils';
import { errorMsgPopup } from '../../utils/errorMsgPopup';
import common from '../../utils/common';
import styles from './StandardDashboard.module.css';

const StandardDashboard = () => {
  const { user } = useStore();
  const navigate = useNavigate();
  const chartRefs = Array.from({ length: 9 }, () => useRef(null)); // 0: 인원 게이지, 1-3: 게이지, 4: 선로/설계 바, 5: BIZ 바, 6-8: 분야 파이
  const params = new URLSearchParams(window.location.search);
  const [month, setMonth] = useState(params.get('month') || common.getTodayDate().substring(0, 7));
  const isFullscreen = params.get('fullscreen') === 'true';
  const [totalData, setTotalData] = useState([]);
  const [orgData, setOrgData] = useState([]);
  const [classData, setClassData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(true);

  // 공통 API 파라미터
  const getApiParams = (pGUBUN) => ({
    pGUBUN,
    pEMPNO: user?.empNo || 'admin',
    pORGCD: user?.orgCd || '214000',
    pORGLEVELGB: '1',
    pDATEGB: 'M',
    pDATE1: month,
    pDATE2: month,
    pDEBUG: 'F',
  });

  // 데이터 로드
  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. 전사 표준활동 입력현황 (TOTALLIST)
      const totalResponse = await fetchData('standard/dashBoard/list', getApiParams('TOTALLIST'));
      if (!totalResponse.success) {
        errorMsgPopup(totalResponse.message || '전사 데이터를 가져오는 중 오류가 발생했습니다.');
        return;
      }
      const processedTotalData = totalResponse.data.map(item => ({
        구분: item.SECTIONCD === 'TOTAL' ? '계' : item.SECTIONCD,
        '입력인원(명)': Number(item.EMPINPUTCNT) || 0,
        '입력시간(h)': Number(item.WORKH) || 0,
        '비율(%)': item.WORKH && item.SECTIONCD !== 'TOTAL'
          ? ((Number(item.WORKH) / Number(totalResponse.data.find(d => d.SECTIONCD === 'TOTAL')?.WORKH)) * 100).toFixed(2)
          : 100,
        '총대상시간(h)': item.SECTIONCD === 'TOTAL' ? Number(item.WORKH) : 0,
      }));
      setTotalData(processedTotalData);

      // 2. 본부별 표준활동 입력현황 (ORGLIST)
      const orgResponse = await fetchData('standard/dashBoard/list', getApiParams('ORGLIST'));
      if (!orgResponse.success) {
        errorMsgPopup(orgResponse.message || '본부별 데이터를 가져오는 중 오류가 발생했습니다.');
        return;
      }
      // ORGNM에서 "설계부"를 "본부"로 변경
      const processedOrgData = orgResponse.data.map(item => ({
        ...item,
        ORGNM: item.ORGNM,
      }));
      setOrgData(processedOrgData);

      // 3. 표준활동 대분류별 입력현황 (CLASSLIST)
      const classResponse = await fetchData('standard/dashBoard/list', getApiParams('CLASSLIST'));
      if (!classResponse.success) {
        errorMsgPopup(classResponse.message || '대분류 데이터를 가져오는 중 오류가 발생했습니다.');
        return;
      }
      setClassData(classResponse.data);
    } catch (err) {
      console.error('데이터 로드 실패:', err);
      errorMsgPopup('데이터를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 사용자 정보 확인 및 데이터 로드
  useEffect(() => {
    if (user === null) {
      setUserLoading(true);
      return;
    }
    setUserLoading(false);
    if (!user) {
      navigate('/');
      return;
    }
    loadData();
  }, [user, month, navigate]);

  // summaryData 계산
  const summaryData = useMemo(() => {
    return [
      {
        구분: '계',
        입력인원: totalData.find(item => item.구분 === '계')?.['입력인원(명)'] || 0,
        입력시간: totalData.find(item => item.구분 === '계')?.['입력시간(h)'] || 0,
      },
      {
        구분: '선로',
        입력인원: totalData.find(item => item.구분 === 'LINE')?.['입력인원(명)'] || 0,
        입력시간: totalData.find(item => item.구분 === 'LINE')?.['입력시간(h)'] || 0,
      },
      {
        구분: '설계',
        입력인원: totalData.find(item => item.구분 === 'DESIGN')?.['입력인원(명)'] || 0,
        입력시간: totalData.find(item => item.구분 === 'DESIGN')?.['입력시간(h)'] || 0,
      },
      {
        구분: 'BIZ',
        입력인원: totalData.find(item => item.구분 === 'BIZ')?.['입력인원(명)'] || 0,
        입력시간: totalData.find(item => item.구분 === 'BIZ')?.['입력시간(h)'] || 0,
      },
    ];
  }, [totalData]);

  // 차트 렌더링
  useEffect(() => {
    if (loading || userLoading || !totalData?.length || !orgData?.length || !classData?.length) return;

    const timer = setTimeout(() => {
      // 1.1 Custom Gauge for 시간 (구분: 계)
      if (chartRefs[0].current) {
        const chart = echarts.init(chartRefs[0].current);
        const totalTimeEntry = totalData.find(item => item.구분 === '계');
        const percentValue = totalTimeEntry ? totalTimeEntry['비율(%)'] : 0;
        const inputTime = totalTimeEntry ? totalTimeEntry['입력시간(h)'] : 0;
        const targetTime = totalTimeEntry ? totalTimeEntry['총대상시간(h)'] : 0;

        chart.setOption({
          tooltip: {
            formatter: `총대상시간(h): ${targetTime}<br/>입력시간(h): ${inputTime}`,
          },
          graphic: [
            {
              type: 'text',
              left: 'center',
              top: '48%',
              style: {
                text: `${percentValue}%`,
                fontSize: 14,
                fontWeight: 'bold',
              },
              z: 10,
            },
          ],
          series: [
            {
              type: 'pie',
              radius: ['70%', '90%'],
              center: ['50%', '50%'],
              avoidLabelOverlap: false,
              label: { show: false, position: 'center' },
              labelLine: { show: false },
              data: [
                { value: percentValue, name: '진행률', itemStyle: { color: '#216DB2' } },
                { value: 100 - percentValue, name: '남은 영역', itemStyle: { color: '#eee' } },
              ],
            },
          ],
        });
      }

      // 1.2-1.4 Stage Speed Gauge for 시간 (선로, 설계, BIZ)
      ['LINE', 'DESIGN', 'BIZ'].forEach((section, i) => {
        if (chartRefs[i + 1].current) {
          const item = totalData.find(item => item.구분 === section);
          const percentValue = item ? item['비율(%)'] : 0;
          const inputTime = item ? item['입력시간(h)'] : 0;
          const totalTime = totalData.find(item => item.구분 === '계')?.['입력시간(h)'] || 0;
          const chart = echarts.init(chartRefs[i + 1].current);
          chart.setOption({
            tooltip: {
              formatter: `총대상시간(h): ${totalTime}<br/> 입력시간(h): ${inputTime}`,
            },
            series: [
              {
                name: item?.구분 || section,
                type: 'pie',
                radius: ['70%', '90%'],
                avoidLabelOverlap: false,
                label: {
                  show: true,
                  position: 'center',
                  formatter: `${percentValue}%`,
                  fontSize: 14,
                  fontWeight: 'bold',
                },
                labelLine: { show: false },
                data: [
                  { value: percentValue, name: '사용', itemStyle: { color: '#2CBBB7' } },
                  { value: 100 - percentValue, name: '남음', itemStyle: { color: '#eee' } },
                ],
              },
            ],
          });
        }
      });

      // 2.1-2.2 조직별 현황: 선로/설계 통합 바 (4), BIZ 바 (5)
      const titles2 = ['선로/설계', 'BIZ'];
        for (let i = 0; i < 2; i++) {
          let seriesData, legendData, xAxisData;
          if (i === 0) {
            const lineData = orgData.filter(item => item.SECTIONCD === 'LINE');
            const designData = orgData.filter(item => item.SECTIONCD === 'DESIGN');
            seriesData = [
              { name: '선로', type: 'bar', data: lineData.map(item => Number(item.WORKH)), itemStyle: { color: '#216DB2' } },
              { name: '설계', type: 'bar', data: designData.map(item => Number(item.WORKH)), itemStyle: { color: '#2CBBB7' } },
            ];
            legendData = ['선로', '설계'];
            xAxisData = lineData.map(item => item.ORGNM);
          } else {
            const bizData = orgData.filter(item => item.SECTIONCD === 'BIZ');
            seriesData = [
              { name: 'BIZ', type: 'bar', data: bizData.map(item => Number(item.WORKH)), itemStyle: { color: '#216DB2' } },
            ];
            legendData = ['BIZ'];
            xAxisData = bizData.map(item => item.ORGNM);
          }

          if (chartRefs[i + 4].current) {
            const chart = echarts.init(chartRefs[i + 4].current);
            chart.setOption({
              grid: {
                show: false,
                left: '5%',
                right: '5%',
                top: '15%',
                bottom: '5%',
                height: '55%',
              },
              tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                formatter: (params) => {
                  let result = `${params[0].name}<br/>`;
                  params.forEach(param => {
                    result += `${param.seriesName}(h): ${param.data.toFixed(2)}<br/>`;
                  });
                  return result;
                },
              },
              legend: {
                icon: 'circle',
                itemWidth: 12,
                itemHeight: 12,
                data: legendData,
                orient: 'horizontal',
                top: 0,
                left: 'center',
              },
              xAxis: {
                type: 'category',
                data: xAxisData,
                axisLabel: {
                  rotate: 0, // 라벨 회전 제거 (가로로 표시)
                  fontSize: 12,
                  interval: 0, // 모든 라벨 표시
                  margin: 10, // 라벨과 축 사이 간격 조정
                },
              },
              yAxis: {
                type: 'value',
                axisLabel: {
                  formatter: '{value}',
                  fontSize: 12,
                  margin: 5, // 라벨과 축 사이 거리 늘림
                  width: 100, // 라벨 너비 확보
                  overflow: 'none', // 텍스트 잘림 방지
                },
                splitLine: { show: false },
              },
              barWidth: '20%',
              series: seriesData,
            });
          }
        }

      // 3.1-3.3 Pie with Rich Text Label (선로, 설계, BIZ)
      ['LINE', 'DESIGN', 'BIZ'].forEach((section, i) => {
        if (chartRefs[i + 6]?.current) {
          const chart = echarts.init(chartRefs[i + 6].current);
          const data = classData
            .filter(item => item.SECTIONCD === section)
            .map(item => ({
              name: item.CLASSANM || 'Unknown',
              value: Number(item.WORKH) || 0,
              time: Number(item.WORKH) || 0,
            }));
          // #216DB2와 #2CBBB7 계열의 색상 팔레트
          const colors = [
            '#216DB2', // 기본 블루
            '#2CBBB7', // 기본 청록
            '#1E5A99', // 블루 계열 어두운 톤
            '#3AC9C5', // 청록 계열 밝은 톤
            '#2A7BCB', // 블루 계열 중간 톤
            '#2cbab7', // 청록 계열 중간 톤
            '#154A80', // 블루 계열 더 어두운 톤
            '#48D7D3', // 청록 계열 더 밝은 톤
          ].slice(0, data.length); // 데이터 개수에 맞게 자름
          chart.setOption({
            tooltip: {
              trigger: 'item',
              formatter: '<b>{b}</b> <br/>시간(h): {c}<br/>비율(%): {d}',
            },
            series: [
              {
                name: '업무 비율',
                type: 'pie',
                radius: [0, '60%'],
                color: colors,
                label: {
                  formatter: '{abg|{b}}\n{hr|}\n{per|{d}%}  {value|{c}시간}',
                  backgroundColor: '#ffffff',
                  borderColor: '#8C8D8E',
                  borderWidth: 1,
                  borderRadius: 4,
                  rich: {
                    abg: { color: '#6E7079', lineHeight: 22, align: 'center' },
                    hr: { borderColor: '#8C8D8E', width: '100%', borderWidth: 1, height: 0 },
                    per: { color: '#212529', backgroundColor: 'transparent', padding: [6, 8] },
                    value: { color: '#212529', backgroundColor: 'transparent', padding: [6, 8] },
                  },
                },
                data: data,
                emphasis: {
                  itemStyle: {
                    shadowBlur: 10,
                    shadowOffsetX: 0,
                    shadowColor: 'rgba(0, 0, 0, 0.5)',
                  },
                },
              },
            ],
          });
        }
      });
    }, 0);

    return () => {
      clearTimeout(timer);
      chartRefs.forEach(ref => ref.current && echarts.dispose(ref.current));
    };
  }, [totalData, orgData, classData, loading, userLoading]);

  if (userLoading) {
    return <div>사용자 정보 로드 중...</div>;
  }

  if (!user) {
    return null; // navigate('/')가 useEffect에서 처리
  }

  return (
    <div className={`chartWrap ${styles.container} ${isFullscreen ? styles.fullscreen : ''}`}>
      <div className='chartRowWrap'>
        <div className='chartTitle'>전사 표준활동 입력현황</div>
        <div className={styles.inputSection}>
          <div className={styles.chartsContainer}>
            <div className={styles.subSection}>
              <div className='subSecTitle'>전체</div>
              <div ref={chartRefs[0]} className={styles.chart} />
            </div>
            <div className={styles.subSection}>
              <div className='subSecTitle'>선로</div>
              <div ref={chartRefs[1]} className={styles.chart} />
            </div>
            <div className={styles.subSection}>
              <div className='subSecTitle'>설계</div>
              <div ref={chartRefs[2]} className={styles.chart} />
            </div>
            <div className={styles.subSection}>
              <div className='subSecTitle'>BIZ</div>
              <div ref={chartRefs[3]} className={styles.chart} />
            </div>
          </div>
          <div className='rightInfo'>
            <div className='rightHeader'>
              <div className='subSecTitle'>소계</div>
              <div className='formGroup'>
                <input
                  type="month"
                  value={month}
                  onChange={e => setMonth(e.target.value)}
                  className={styles.monthInput}
                />
                <button className={styles.refreshButton} onClick={() => user && loadData()}>
                  <i className="bi bi-arrow-repeat"></i>
                </button>
              </div>
            </div>
            <table className={styles.gridTable}>
              <thead>
                <tr>
                  <th>구분</th>
                  <th>인원(명)</th>
                  <th>입력시간(h)</th>
                </tr>
              </thead>
              <tbody>
                {summaryData.map((item, index) => (
                  <tr key={index}>
                    <td>{item.구분}</td>
                    <td>{item.입력인원}</td>
                    <td>{item.입력시간}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className='chartRowWrap'>
        <div className='chartTitle'>조직별 표준활동 입력현황</div>
        <div className={styles.headquarterSection}>
          <div className={styles.subSection}>
            <div className='subSecTitle'>선로/설계</div>
            <div ref={chartRefs[4]} className={styles.chart} />
          </div>
          <div className={styles.subSection}>
            <div className='subSecTitle'>BIZ</div>
            <div ref={chartRefs[5]} className={styles.chart} />
          </div>
        </div>
      </div>
      <div className='chartRowWrap'>
        <div className='chartTitle'>대분류별 표준활동 입력현황</div>
        <div className={styles.fieldSection}>
          <div className={styles.subSection}>
            <div className='subSecTitle'>선로</div>
            <div ref={chartRefs[6]} className={styles.chart} />
          </div>
          <div className={styles.subSection}>
            <div className='subSecTitle'>설계</div>
            <div ref={chartRefs[7]} className={styles.chart} />
          </div>
          <div className={styles.subSection}>
            <div className='subSecTitle'>BIZ</div>
            <div ref={chartRefs[8]} className={styles.chart} />
          </div>
        </div>
      </div>
      {loading && <div>로딩 중...</div>}
    </div>
  );
};

export default StandardDashboard;
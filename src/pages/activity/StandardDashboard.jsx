import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as echarts from 'echarts';
import useStore from '../../store/store';
import { fetchData } from '../../utils/dataUtils';
import { errorMsgPopup } from '../../utils/errorMsgPopup';
import common from '../../utils/common';
import styles from './StandardDashboard.module.css';
import chartImg01 from '../../assets/images/chartImg01.svg';
import chartImg02 from '../../assets/images/chartImg02.svg';
import chartImg03 from '../../assets/images/chartImg03.svg';
import visualImg from '../../assets/images/dashboardImg.svg';

const StandardDashboard = () => {
  const { user } = useStore();
  const navigate = useNavigate();
  const chartRefs = Array.from({ length: 10 }, () => useRef(null)); // 0: 인원 게이지, 1-3: 게이지, 4-6: 선로/설계/BIZ 바, 7-9: 분야 파이
  const params = new URLSearchParams(window.location.search);
  const [month, setMonth] = useState(params.get('month') || common.getTodayDate().substring(0, 7));
  const isFullscreen = params.get('fullscreen') === 'true';
  const [totalData, setTotalData] = useState([]);
  const [tobeData, setTobeData] = useState([]);
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
        '대상인원(명)': Number(item.EMPTARGETCNT) || 0,
        '입력인원(명)': Number(item.EMPINPUTCNT) || 0,
        '대상시간(h)': Number(item.TARGETWORKH) || 0,
        '입력시간(h)': Number(item.WORKH) || 0,
        '비율(%)': item.WORKH && item.SECTIONCD !== 'TOTAL'
          ? ((Number(item.WORKH) / Number(totalResponse.data.find(d => d.SECTIONCD === 'TOTAL')?.WORKH)) * 100).toFixed(2)
          : 100,
        '총대상시간(h)': item.SECTIONCD === 'TOTAL' ? Number(item.WORKH) : 0,
      }));
      setTotalData(processedTotalData);

      // 2. 대분류별 표준활동 추이현황 (TOBELIST)
      const tobeResponse = await fetchData('standard/dashBoard/list', getApiParams('TOBELIST'));
      if (!tobeResponse.success) {
        errorMsgPopup(tobeResponse.message || '본부별 데이터를 가져오는 중 오류가 발생했습니다.');
        return;
      }
      const processedTobeData = tobeResponse.data.map(item => ({
        ...item,
        ORGNM: item.ORGNM,
      }));
      setTobeData(processedTobeData);

      // 3. 대분류별 표준활동 입력현황 (CLASSLIST)
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
        대상인원: totalData.find(item => item.구분 === '계')?.['대상인원(명)'] || 0,
        입력인원: totalData.find(item => item.구분 === '계')?.['입력인원(명)'] || 0,
        대상시간: totalData.find(item => item.구분 === '계')?.['대상시간(h)'] || 0,
        입력시간: totalData.find(item => item.구분 === '계')?.['입력시간(h)'] || 0,
      },
      {
        구분: '선로',
        대상인원: totalData.find(item => item.구분 === 'LINE')?.['대상인원(명)'] || 0,
        입력인원: totalData.find(item => item.구분 === 'LINE')?.['입력인원(명)'] || 0,
        대상시간: totalData.find(item => item.구분 === 'LINE')?.['대상시간(h)'] || 0,
        입력시간: totalData.find(item => item.구분 === 'LINE')?.['입력시간(h)'] || 0,
      },
      {
        구분: '설계',
        대상인원: totalData.find(item => item.구분 === 'DESIGN')?.['대상인원(명)'] || 0,
        입력인원: totalData.find(item => item.구분 === 'DESIGN')?.['입력인원(명)'] || 0,
        대상시간: totalData.find(item => item.구분 === 'DESIGN')?.['대상시간(h)'] || 0,
        입력시간: totalData.find(item => item.구분 === 'DESIGN')?.['입력시간(h)'] || 0,
      },
      {
        구분: 'BIZ',
        대상인원: totalData.find(item => item.구분 === 'BIZ')?.['대상인원(명)'] || 0,
        입력인원: totalData.find(item => item.구분 === 'BIZ')?.['입력인원(명)'] || 0,
        대상시간: totalData.find(item => item.구분 === 'BIZ')?.['대상시간(h)'] || 0,
        입력시간: totalData.find(item => item.구분 === 'BIZ')?.['입력시간(h)'] || 0,
      },
    ];
  }, [totalData]);

  // 차트 렌더링
  useEffect(() => {
    if (loading || userLoading || !totalData?.length || !tobeData?.length || !classData?.length) return;

    const timer = setTimeout(() => {
      // 1.1 Custom Gauge for 시간 (구분: 계)
      if (chartRefs[0].current) {
        const chart = echarts.init(chartRefs[0].current);
        const totalTimeEntry = totalData.find(item => item.구분 === '계');
        const inputTime = totalTimeEntry ? totalTimeEntry['입력시간(h)'] : 0;
        const targetTime = totalTimeEntry ? totalTimeEntry['대상시간(h)'] : 0;
        const percentValue = targetTime > 0 ? ((inputTime / targetTime) * 100).toFixed(2) : 0;

        chart.setOption({
          tooltip: {
            formatter: `대상시간(h): ${targetTime}<br/>입력시간(h): ${inputTime}`,
          },
          graphic: [
            {
              type: 'text',
              left: 'center',
              top: '36%',
              style: {
                text: `${percentValue}%`,
                fontSize: 16,
                fontWeight: 'bold',
                fill: '#208bec',
              },
              z: 10,
            },
            {
              type: 'text',
              left: 'center',
              top: '54%',
              style: {
                text: '전체',
                fontSize: 12,
                fontWeight: 'normal',
                fill: '#ffffff',
                opacity: '.7'
              },
              z: 10,
            },
          ],
          series: [
            {
              type: 'pie',
              radius: ['60%', '90%'],
              center: ['50%', '50%'],
              avoidLabelOverlap: false,
              label: { show: false, position: 'center' },
              labelLine: { show: false },
              data: [
                { value: percentValue, name: '진행률', itemStyle: { color: '#208bec', borderRadius: '50%' } },
                { value: 100 - percentValue, name: '남은 영역', itemStyle: { color: '#262a3b' } },
              ],
            },
          ],
        });
      }

      // 1.2-1.4 Stage Speed Gauge for 시간 (선로, 설계, BIZ)
      ['LINE', 'DESIGN', 'BIZ'].forEach((section, i) => {
        const sectionLabels = {LINE: '선로', DESIGN: '설계', BIZ: 'BIZ'};

        if (chartRefs[i + 1].current) {
          const item = totalData.find(item => item.구분 === section);
          const inputTime = item ? item['입력시간(h)'] : 0;
          const targetTime = item ? item['대상시간(h)'] : 0;
          const percentValue = targetTime > 0 ? ((inputTime / targetTime) * 100).toFixed(2) : 0;
          const chart = echarts.init(chartRefs[i + 1].current);
          chart.setOption({
            tooltip: {
              formatter: `대상시간(h): ${targetTime}<br/> 입력시간(h): ${inputTime}`,
            },
            graphic: [
              {
                type: 'text',
                left: 'center',
                top: '36%',
                style: {
                  text: `${percentValue}%`,
                  fontSize: 16,
                  fontWeight: 'bold',
                  fill: '#1cd6d1',
                },
                z: 10,
              },
              {
                type: 'text',
                left: 'center',
                top: '54%',
                style: {
                  text: sectionLabels[item?.구분 || section] || (item?.구분 || section),
                  fontSize: 12,
                  fontWeight: 'normal',
                  fill: '#ffffff',
                  opacity: '.7'
                },
                z: 10,
              },
            ],            
            series: [
              {
                name: item?.구분 || section,
                type: 'pie',
                radius: ['60%', '90%'],
                avoidLabelOverlap: false,
                // label: {
                //   show: true,
                //   position: 'center',
                //   formatter: `${percentValue}%`,
                //   fontSize: 18,
                //   fontWeight: 'bold',
                //   color: '#2CBBB7',
                // },
                labelLine: { show: false },
                // data: [
                //   { value: percentValue, name: '사용', itemStyle: { color: '#2CBBB7' } },
                //   { value: 100 - percentValue, name: '남음', itemStyle: { color: '#eee' } },
                // ],
                data: [
                  { value: percentValue, itemStyle: { color: '#1cd6d1', borderRadius: '50%' } },
                  { value: 100 - percentValue, itemStyle: { color: '#2d3348' } },
                ],
              },
            ],
          });
        }
      });

      // 2.1-2.3 추이 현황: 선로, 설계, BIZ 가로형 누적 바 차트
      ['LINE', 'DESIGN', 'BIZ'].forEach((section, i) => {
        if (chartRefs[i + 4].current) {
          const chart = echarts.init(chartRefs[i + 4].current);
          const sectionTitleMap = {
            LINE: '선로',
            DESIGN: '설계',
            BIZ: 'BIZ'
          };
          const dynamicTitle = sectionTitleMap[section] || section;
          // SECTIONCD에 해당하는 데이터 필터링
          const sectionData = tobeData.filter(item => item.SECTIONCD === section);
          // MDATE 목록 추출 (고유값)
          const mDates = [...new Set(sectionData.map(item => item.MDATE).filter(date => date))].sort();
          // CLASSANM 목록 추출 (고유값)
          const classNames = [...new Set(sectionData.map(item => item.CLASSANM).filter(name => name))];
          // 색상 팔레트
          const colors = [
            '#234984', '#0076c5', '#25b3fe', 
            '#0ec9dc', '#0897b5', '#3a6b8d'
          ].slice(0, classNames.length);
          // 데이터 정규화: 각 MDATE의 총 WORKH 계산
          const totalWorkHByDate = mDates.map(mDate => {
            return sectionData
              .filter(d => d.MDATE === mDate)
              .reduce((sum, item) => sum + (Number(item.WORKH) || 0), 0);
          });
          // 시리즈 데이터 생성 (정규화된 비율로 변환, 100% 초과 방지)
          const topBorder = 6;
          const bottomBorder = 0;
          const seriesData = classNames.map((className, idx) => ({
            name: className,
            type: 'bar',
            barWidth: 60,
            stack: 'total',
            itemStyle: {
              color: colors[idx]
            },
            data: mDates.map((mDate, dateIdx) => {
              const item = sectionData.find(d => d.MDATE === mDate && d.CLASSANM === className);
              const workH = item ? Number(item.WORKH) : 0;
              const totalWorkH = totalWorkHByDate[dateIdx];
              const value = totalWorkH > 0 ? Math.min(((workH / totalWorkH) * 100).toFixed(2), 100) : 0;
              const valuesForDate = classNames.map((cn) => {
              const d = sectionData.find(d => d.MDATE === mDate && d.CLASSANM === cn);
              return d ? Number(d.WORKH) : 0;
              });
              const topIndex = valuesForDate.findLastIndex(v => v > 0);
              const isTop = idx === topIndex;
              return {
                value,
                itemStyle: {
                  color: colors[idx],
                  borderRadius: isTop ? [topBorder, topBorder, bottomBorder, bottomBorder] : [0, 0, 0, 0]
                }
              };
            }),
            label: {
              show: true,
              formatter: (params) => params.value > 0 ? `${Math.min(params.value, 100)}%` : '',
              fontSize: 11,
              color: '#fff',
              overflow: 'none', // 라벨이 잘리지 않도록 설정
              // textBorderColor: '#171717', // 텍스트 가독성을 위해 테두리 추가
              // textBorderWidth: 1.5,
            },
            z: 5
          }));
          // 간격 선 생성 (폴리곤 제거로 인해 주석 처리)
          const grid = {
            left: 60,
            right: 50,
            top: 60,
            bottom: 50
          };
          // const gridWidth = chart.getWidth() - grid.left - grid.right;
          // const gridHeight = chart.getHeight() - grid.top - grid.bottom;

          chart.setOption({
            title: {
              // text: item?.구분 || section, // 원하는 타이틀 텍스트
              text: dynamicTitle,
              left: 'left',
              top: 'top',
              textStyle: {
                fontSize: 16,
                fontWeight: 'normal',
                fontFamily: 'Pretendard Variable',
                color: '#ffffff',
                opacity: '.7'
              },
            },
            grid: {
              show: false,
              left: grid.left,
              right: grid.right,
              top: grid.top,
              bottom: 40,
              height: '70%',
            },
            tooltip: {
              trigger: 'axis',
              axisPointer: { type: 'shadow' },
              formatter: (params) => {
                let result = `${params[0].name}<br/>`;
                params.forEach(param => {
                  if (param.value > 0) {
                    result += `${param.seriesName}: ${Math.min(param.value, 100)}%<br/>`;
                  }
                });
                return result;
              },
            },
            legend: {
              icon: 'circle',
              itemWidth: 12,
              itemHeight: 12,
              data: classNames,
              orient: 'horizontal',
              bottom: 0,
              left: 'center',
              textStyle: {
                color: '#ffffff',
                opacity: '.7'
              },
            },
            yAxis: {
              type: 'value',
              max: 100, // 100% 초과 방지
              axisLabel: {
                formatter: '{value}%',
                fontSize: 12,
                margin: 10,
              },
              splitLine: { show: false },
            },
            xAxis: {
              type: 'category',
              data: mDates,
              axisLabel: {
                fontSize: 12,
                interval: 0,
                margin: 10,
                formatter: (value) => value,
              },
            },
            series: seriesData,
          });
        }
      });

      // 3.1-3.3 Pie with Rich Text Label (선로, 설계, BIZ)
      ['LINE', 'DESIGN', 'BIZ'].forEach((section, i) => {
        if (chartRefs[i + 7]?.current) {
          const chart = echarts.init(chartRefs[i + 7].current);
          const sectionTitleMap = {
            LINE: '선로',
            DESIGN: '설계',
            BIZ: 'BIZ'
          };
          const dynamicTitle = sectionTitleMap[section] || section;         
          const data = classData
            .filter(item => item.SECTIONCD === section)
            .map(item => ({
              name: item.CLASSANM || 'Unknown',
              value: Number(item.WORKH) || 0,
              time: Number(item.WORKH) || 0,
            }));
          const colors = [
            '#234984', '#0076c5', '#25b3fe', 
            '#0ec9dc', '#0897b5', '#3a6b8d'
          ].slice(0, data.length);
          chart.setOption({
            title: {
              text: dynamicTitle,
              left: 'left',
              top: 'top',
              textStyle: {
                fontSize: 16,
                fontWeight: 'normal',
                fontFamily: 'Pretendard Variable',
                color: '#ffffff',
                opacity: '.7'
              },
            },
            tooltip: {
              trigger: 'item',
              formatter: '<b>{b}</b> <br/>시간(h): {c}<br/>비율(%): {d}',
            },
            series: [
              {
                name: '업무 비율',
                type: 'pie',
                radius: ['40%', '70%'],
                center: ['50%', '60%'],
                padAngle: 0,
                color: colors,
                label: {
                  // show: false,
                  // position: 'center'
                  formatter: '{abg|{b}}\n{hr|}\n{per|{d}%}  {value|{c}시간}',
                  backgroundColor: '#262a3b',
                  padding: 6,
                  borderRadius: 8,
                  rich: {
                    abg: { color: '#ffffff', lineHeight: 22, align: 'center', padding: [6, 8] },
                    hr: { borderColor: 'rgba(125, 125, 125, .3)', width: '100%', borderWidth: 1, height: 0 },
                    per: { color: '#ffffff', backgroundColor: 'transparent', padding: [6, 8] },
                    value: { color: '#bce6f7', backgroundColor: 'transparent', padding: [6, 8] },
                  },
                },
                 itemStyle: {
                  borderRadius: 4,
                  borderWidth: 3,
                  borderColor: '#1f2330'
                },
                data: data,
                emphasis: {
                  label: {
                    show: true,
                    color: '#4a4a4a',
                    fontSize: 14,
                    fontWeight: 'bold'
                  },
                },
                 labelLine: {
                    show: true,           // 라벨과 파이 영역을 잇는 라인 표시 여부
                    length: 15,           // 라인의 첫 번째 구간 길이
                    length2: 8,          // 라인의 두 번째 구간 길이
                    smooth: true,         // 라인의 곡선 여부
                }
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
  }, [totalData, tobeData, classData, loading, userLoading]);

  if (userLoading) {
    return <div>사용자 정보 로드 중...</div>;
  }

  if (!user) {
    return null; // navigate('/')가 useEffect에서 처리
  }

  return (
    <div className={`chartWrap ${styles.container} ${isFullscreen ? styles.fullscreen : ''}`}>
      <div className='inputSection'>
        <div className='subSectionSearch'>
          <img src={visualImg} className='visualImg' />
          <div className='formWrap'>
            <div className='chartTitle' style={{height: '30px'}}>전사 표준활동 입력현황</div>
            <div className='formGroup'>
              {/* <input
                type="month"
                value={month}
                onChange={e => setMonth(e.target.value)}
                className='monthInput'
              /> */}
              <div className="month-input-wrapper">
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="monthInput"
                />
                <span className="calendar-icon">
                  <i className="bi bi-calendar3"></i>
                </span>
              </div>
              <button className='refreshButton' onClick={() => user && loadData()}>
                <i className="bi bi-arrow-repeat"></i>
              </button>
            </div>
          </div>
        </div>
        <div className='subSectionChart'>
          <div ref={chartRefs[0]} className='chartItem'/>
          <div ref={chartRefs[1]} className='chartItem'/>
          <div ref={chartRefs[2]} className='chartItem'/>
          <div ref={chartRefs[3]} className='chartItem'/>
        </div>
        <table className='subSectionTable'>
          <thead>
            <tr>
              <th>구분</th>
              <th>대상인원(명)</th>
              <th>입력인원(명)</th>
              <th>대상시간(h)</th>
              <th>입력시간(h)</th>
            </tr>
          </thead>
          <tbody>
            {summaryData.map((item, index) => (
              <tr key={index}>
                <td>{item.구분}</td>
                <td>{item.대상인원}</td>
                <td>{item.입력인원}</td>
                <td>{item.대상시간}</td>
                <td>{item.입력시간}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className='rightSection'>
        <div>
          <div className='chartTitle'>대분류별 표준활동 추이현황</div>
          <div className='fieldSection'>
            <div className='subSection'>
              {/* <div className='subSecTitle'>선로</div> */}
              <div ref={chartRefs[4]} className='chartBar' />
            </div>
            <div className='subSection'>
              {/* <div className='subSecTitle'>설계</div> */}
              <div ref={chartRefs[5]} className='chartBar' />
            </div>
            <div className='subSection'>
              {/* <div className='subSecTitle'>BIZ</div> */}
              <div ref={chartRefs[6]} className='chartBar' />
            </div>
          </div>
        </div>
        <div>
          <div className='chartTitle'>대분류별 표준활동 입력현황</div>
          <div className='fieldSection'>
            <div className='subSection'>
              {/* <div className='subSecTitle'>선로</div> */}
              <div ref={chartRefs[7]} className='chart' />
            </div>
            <div className='subSection'>
              {/* <div className='subSecTitle'>설계</div> */}
              <div ref={chartRefs[8]} className='chart' />
            </div>
            <div className='subSection'>
              {/* <div className='subSecTitle'>BIZ</div> */}
              <div ref={chartRefs[9]} className='chart' />
            </div>
          </div>
        </div>
      </div>

      {loading && <div>로딩 중...</div>}
    </div>
  );
};

export default StandardDashboard;
import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import styles from './StandardDashboard.module.css';
import chartTotalData from '../../data/standardactivity_charttotal.json';
import chartTotalData2 from '../../data/standardactivity_charttotal2.json';
import headquarterLineData from '../../data/standardactivity_headquarter_line_data.json';
import headquarterDesignData from '../../data/standardactivity_headquarter_design_data.json';
import headquarterBizData from '../../data/standardactivity_headquarter_biz_data.json';
import fieldworkData from '../../data/standardactivity_fieldwork_data2.json';

const StandardDashboard = () => {
  const chartRefs = Array.from({ length: 9 }, () => useRef(null)); // 0: 인원 게이지, 1-3: 게이지, 4: 통합 바, 5: BIZ 바, 6-8: 분야 파이
  const params = new URLSearchParams(window.location.search);
  const [month, setMonth] = useState(params.get('month') || '2025-08');
  const isFullscreen = params.get('fullscreen') === 'true';

  // 각 구분별 데이터 계산
  const summaryData = useMemo(() => {
    const totalEntry = chartTotalData.find(item => item.구분 === '계');
    const totalTimeEntry = chartTotalData2.find(item => item.구분 === '계');
    return [
      {
        구분: '계',
        입력인원: totalEntry ? totalEntry['입력인원(명)'] : 0,
        입력시간: totalTimeEntry ? totalTimeEntry['입력시간(h)'] : 0,
      },
      {
        구분: '선로',
        입력인원: chartTotalData.find(item => item.구분 === '선로')?.['입력인원(명)'] || 0,
        입력시간: chartTotalData2.find(item => item.구분 === '선로')?.['입력시간(h)'] || 0,
      },
      {
        구분: '설계',
        입력인원: chartTotalData.find(item => item.구분 === '설계')?.['입력인원(명)'] || 0,
        입력시간: chartTotalData2.find(item => item.구분 === '설계')?.['입력시간(h)'] || 0,
      },
      {
        구분: 'BIZ',
        입력인원: chartTotalData.find(item => item.구분 === 'BIZ')?.['입력인원(명)'] || 0,
        입력시간: chartTotalData2.find(item => item.구분 === 'BIZ')?.['입력시간(h)'] || 0,
      },
    ];
  }, []);

   useEffect(() => {
    const timer = setTimeout(() => {
      // 1.1 Custom Gauge for 시간 (구분: 계) - ECharts custom-gauge 예제 기반 수정
      if (chartRefs[0].current) {
        const chart = echarts.init(chartRefs[0].current);
        const totalTimeEntry = chartTotalData2.find(item => item.구분 === '계');
        const percentValue = totalTimeEntry ? totalTimeEntry['비율(%)'] : 0;
        const inputTime = totalTimeEntry ? totalTimeEntry['입력시간(h)'] : 0;
        const targetTime = totalTimeEntry ? totalTimeEntry['총대상시간(h)'] : 0;

        chart.setOption({
          tooltip: {
            formatter: `총대상시간: ${targetTime}h<br/>입력시간: ${inputTime}h`,
          },
          graphic: [
          {
            type: 'text',
            left: 'center',
            top: '48%', // anchor 위쪽에 배치
            style: {
              text: `${percentValue}%`,
              fontSize: 14,
              fontWeight: 'bold',
              fill: 'rgb(0,50,190)',
              textAlign: 'center',
            },
            z: 10, // 렌더링 우선순위 조정
          },
        ],
          series: [
            {
              type: 'gauge',
              center: ['50%', '50%'],
              startAngle: -90,
              endAngle: 270,
              min: 0,
              max: 100,
              splitNumber: 10,
              itemStyle: {
                color: 'rgb(0,50,190)', // 예제의 메인 색상
              },
              progress: {
                show: true,
                width: 10,
                itemStyle: {
                  color: 'rgb(0,50,190)',
                },
              },
              pointer: {
                show: true,
                length: '60%',
                width: 8,
                itemStyle: {
                  color: 'rgb(0,50,190)', // 예제의 포인터 색상
                },
              },
              axisLine: {
                lineStyle: {
                  width: 26,
                  color: [
                    [percentValue / 100, '#6560c7'],
                    [1, '#E6EBF8'], // 배경 색상
                  ],
                },
                show:false
              },
              axisTick: {
                distance: -15,
                splitNumber: 5,
                lineStyle: {
                  width: 2,
                  color: '#999',
                },
                show:false
              },
              splitLine: {
                distance: -12,
                length: 14,
                lineStyle: {
                  width: 3,
                  color: '#999',
                },
                show:false
              },
              axisLabel: {
                distance: 10,
                color: '#999',
                fontSize: 12,
                show: false,
              },
              anchor: {
                show: true,
                showAbove: true,
                size: 135,
                itemStyle: {
                  borderWidth: 10,
                  borderColor: '#FAFAFA',
                  shadowBlur: 25,
                  shadowColor: 'rgba(76,107,167,0.4)', // 예제의 그림자 효과
                },
              },
              title: {
                show: false, // title 비활성화
              },
              detail: {
                show:false
              },
              data: [
                {
                  value: percentValue,
                },
              ],
            },
          ],
        });
      }

      // Stage Speed Gauge for 시간 (3개: 선로, 설계, BIZ)
      for (let i = 0; i < 3; i++) {
        if (chartRefs[i + 1].current) {
          const item = chartTotalData2[i];
          const percentValue = item['비율(%)'];
          const gubun = item['구분'];
          const inputTime = item['입력시간(h)'];
          const totalTime = item['총대상시간(h)'];
          const chart = echarts.init(chartRefs[i + 1].current);
          chart.setOption({
            tooltip: {
              formatter: '{a} <br/>총대상시간: ' + totalTime + 'h <br/> 입력시간: ' + inputTime + 'h',
            },
            series: [
              {
                name: item.구분,
                type: 'gauge',
                progress: {
                  show: true,
                  width: 10,
                },
                axisLine: {
                  lineStyle: {
                    width: 10,
                  },
                },
                axisTick: {
                  show: false,
                },
                splitLine: {
                  length: 10,
                  lineStyle: {
                    width: 2,
                    color: '#999',
                  },
                  distance: -1,
                },
                axisLabel: {
                  distance: 10,
                  color: '#999',
                  fontSize: 10,
                },
                anchor: {
                  show: true,
                  showAbove: true,
                  size: 10,
                  itemStyle: {
                    borderWidth: 10,
                  },
                },
                detail: {
                  valueAnimation: true,
                  formatter: percentValue,
                  color: 'inherit',
                  fontSize: 14,
                  offsetCenter: [0, '70%'],
                },
                data: [
                  {
                    value: percentValue,
                    name: gubun,
                  },
                ],
                title: {
                  fontSize: 12,
                  offsetCenter: [0, '-110%'],
                },
              },
            ],
          });
        }
      }

      // 조직별 현황: 선로+설계 통합 바 (4), BIZ 바 (5)
      const titles2 = ['선로/설계', 'BIZ'];
      for (let i = 0; i < 2; i++) {
        let seriesData, legendData, xAxisData;
        if (i === 0) {
          seriesData = [
            { name: '선로', type: 'bar', data: headquarterLineData.map(item => item['업무량(시간)'] / 100) },
            { name: '설계', type: 'bar', data: headquarterDesignData.map(item => item['업무량(시간)'] / 100) },
          ];
          legendData = ['선로', '설계'];
          xAxisData = headquarterLineData.map(item => item.ORGNM);
        } else {
          seriesData = [
            { name: '업무량(시간)', type: 'bar', data: headquarterBizData.map(item => item['업무량(시간)'] / 100) },
          ];
          legendData = ['업무량(시간)'];
          xAxisData = headquarterBizData.map(item => item.ORGNM);
        }

        if (chartRefs[i + 4].current) {
          const chart = echarts.init(chartRefs[i + 4].current);
          chart.setOption({
            tooltip: {
              trigger: 'axis',
              axisPointer: { type: 'shadow' },
              formatter: (params) => {
                let result = `${params[0].name}<br/>`;
                params.forEach(param => {
                  result += `${param.seriesName}: ${param.data * 100}<br/>`;
                });
                return result;
              },
            },
            legend: { data: legendData },
            xAxis: { type: 'category', data: xAxisData },
            yAxis: { type: 'value' },
            barWidth: '20%',
            series: seriesData,
          });
        }
      }

      // 3.1-3.3 Pie with Rich Text Label
      for (let i = 0; i < 3; i++) {
        let chartData = fieldworkData;
        if (chartRefs[i + 6]?.current && chartData) {
          const chart = echarts.init(chartRefs[i + 6].current);
          const data = chartData.map(item => ({
            name: item.업무 || 'Unknown',
            value: parseFloat(item['비율(%)']) || 0,
            time: item['시간(h)'] || 0,
          }));
          // i에 따라 제목 동적으로 설정
          const titles = ['선로', '설계', 'BIZ'];
          chart.setOption({
            title: {
              show: true,
              text: titles[i], // i=0: 선로, i=1: 설계, i=2: BIZ
              left: 'center', // 제목을 차트 중앙에 배치
              top: '5%', // 차트 상단에서 약간 띄움
              textStyle: {
                fontSize: 12,
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
                radius: [0, '60%'],
                label: {
                  formatter: '{abg|{b}}\n{hr|}\n{per|{d}%}  {value|{c}시간}',
                  backgroundColor: 'transparent',
                  borderColor: '#aaa',
                  borderWidth: 1,
                  borderRadius: 4,
                  rich: {
                    abg: {
                      backgroundColor: 'transparent',
                      width: '100%',
                      align: 'center',
                      height: 20,
                      borderRadius: [4, 4, 0, 0],
                    },
                    hr: {
                      borderColor: '#aaa',
                      width: '100%',
                      borderWidth: 0.5,
                      height: 0,
                    },
                    per: {
                      color: '#000',
                      padding: [2, 4],
                      borderRadius: 2,
                    },
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
      }
    }, 0);

    return () => {
      clearTimeout(timer);
      chartRefs.forEach(ref => ref.current && echarts.dispose(ref.current));
    };
  }, [summaryData]);

  return (
    <div className={`chartWrap ${styles.container} ${isFullscreen ? styles.fullscreen : ''}`}>
      <div className={styles.inputSection}>
        <div className={styles.chartsContainer}>
          <div className={styles.subSection}>
            <div ref={chartRefs[0]} className={styles.chart} />
          </div>
          <div className={styles.subSection}>
            <div ref={chartRefs[1]} className={styles.chart} />
          </div>
          <div className={styles.subSection}>
            <div ref={chartRefs[2]} className={styles.chart} />
          </div>
          <div className={styles.subSection}>
            <div ref={chartRefs[3]} className={styles.chart} />
          </div>
        </div>
        <div className={styles.rightInfo}>
          <div className={styles.rightHeader}>
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className={styles.monthInput}
            />
            <button className={styles.refreshButton}>🔄</button>
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
      <div className={styles.headquarterSection}>
        <div className={styles.subSection}>
          <div ref={chartRefs[4]} className={styles.chart} />
        </div>
        <div className={styles.subSection}>
          <div ref={chartRefs[5]} className={styles.chart} />
        </div>
      </div>
      <div className={styles.fieldSection}>
        <div className={styles.subSection}>
          <div ref={chartRefs[6]} className={styles.chart} />
        </div>
        <div className={styles.subSection}>
          <div ref={chartRefs[7]} className={styles.chart} />
        </div>
        <div className={styles.subSection}>
          <div ref={chartRefs[8]} className={styles.chart} />
        </div>
      </div>
    </div>
  );
};

export default StandardDashboard;
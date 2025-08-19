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
  const chartRefs = Array.from({ length: 9 }, () => useRef(null)); // 0: 인원 파이, 1-3: 게이지, 4: 통합 바, 5: BIZ 바, 6-8: 분야 파이
  const params = new URLSearchParams(window.location.search);
  const [month, setMonth] = useState(params.get('month') || '2025-08');
  const isFullscreen = params.get('fullscreen') === 'true';

  const totalPeople = useMemo(() => {
    return chartTotalData.reduce((sum, item) => sum + item['입력인원(명)'], 0);
  }, []);

  const totalTime = useMemo(() => {
    return chartTotalData2.reduce((sum, item) => sum + item['입력시간(h)'], 0);
  }, []);


  useEffect(() => {
    const timer = setTimeout(() => {
      // 1.1 Pie Donut for 인원
      if (chartRefs[0].current) {
        const chart = echarts.init(chartRefs[0].current);
        chart.setOption({
          title: {
            text: `${totalPeople}`,
            subtext: '입력인원(명)',
            left: 'center',
            top: 'center',
            textStyle: { fontSize: 20 },
            subtextStyle: { fontSize: 10 }
          },
          tooltip: {
            trigger: 'item',
            formatter: (params) => `${params.name}<br> 입력대상: ${params.data.targetPeople}(명) <br>입력인원: ${params.data.people}(명)`
          },
          series: [{
            type: 'pie',
            radius: ['40%', '70%'],
            data: chartTotalData.map(item => ({
              name: item.구분,
              value: item['비율(%)'] * 100,
              people: item['입력인원(명)'],
              targetPeople: item['입력대상(명)']
            })),
            label: { formatter: '{b}: {d}%' },
            itemStyle: { borderRadius: 5 },
            emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } },
          }],
        });
      }

      // Stage Speed Gauge for 시간 (3개: 선로, 설계, BIZ)
      for (let i = 0; i < 3; i++) {
        if (chartRefs[i + 1].current) {
          const item = chartTotalData2[i];
          const percentValue = item['비율(%)'] * 100;
          const gubun = item['구분'];
          const inputTime = item['입력시간(h)'];
          const totalTime = item['총대상시간(h)'];
          const chart = echarts.init(chartRefs[i + 1].current);
          chart.setOption({
            tooltip: {
              formatter: '{a} <br/>총대상시간: ' + totalTime + 'h <br/> 입력시간: ' + inputTime + 'h'
            },
            series: [{
              name: item.구분,
              type: 'gauge',
              min: 0,
              max: 100,
              pointer: {
                itemStyle: {
                  color: 'auto'
                }
              },
              axisLine: {
                lineStyle: {
                  width: 18,
                  color: [
                    [0.3, '#67e0e3'],
                    [0.7, '#37a2da'],
                    [1, '#fd666d']
                  ]
                }
              },
              axisTick: { show: false },
              splitLine: {
                show: true,
                length: 8,
                distance: -4,
                lineStyle: { color: '#fff', width: 2 }
              },
              axisLabel: {
                show: true,
                distance: 15,
                color: '#999',
                fontSize: 10
              },
              detail: {
                valueAnimation: true,
                formatter: inputTime + ' h',
                color: 'inherit',
                fontSize: 12,
                offsetCenter: [0, '80%']
              },
              data: [{
                value: percentValue,
                name: gubun
              }],
              title: {
                fontSize: 12,
                offsetCenter: [0, '-110%']
              }
            }]
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
            { name: '설계', type: 'bar', data: headquarterDesignData.map(item => item['업무량(시간)'] / 100) }
          ];
          legendData = ['선로', '설계'];
          xAxisData = headquarterLineData.map(item => item.ORGNM);
        } else {
          seriesData = [
            { name: '업무량(시간)', type: 'bar', data: headquarterBizData.map(item => item['업무량(시간)'] / 100) }
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
              }
            },
            legend: { data: legendData },
            xAxis: { type: 'category', data: xAxisData },
            yAxis: { type: 'value' },
            barWidth: '12%',
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
            time: item['시간(h)'] || 0
          }));
          chart.setOption({
            tooltip: {
              trigger: 'item',
              formatter: '<b>{b}</b> <br/>시간(h): {c}<br/>비율(%): {d}'
            },
            series: [{
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
                    borderRadius: [4, 4, 0, 0]
                  },
                  hr: {
                    borderColor: '#aaa',
                    width: '100%',
                    borderWidth: 0.5,
                    height: 0
                  },
                  per: {
                    color: '#000',
                    padding: [2, 4],
                    borderRadius: 2
                  }
                }
              },
              data: data,
              emphasis: {
                itemStyle: {
                  shadowBlur: 10,
                  shadowOffsetX: 0,
                  shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
              }
            }]
          });
        }
      }
    }, 0);

    return () => {
      clearTimeout(timer);
      chartRefs.forEach(ref => ref.current && echarts.dispose(ref.current));
    };
  }, [totalPeople, totalTime]);

  return (
    <div className={`${styles.container} ${isFullscreen ? styles.fullscreen : ''}`}>
      <div className={styles.header}>
        <h2>입력현황</h2>
      </div>
      <div className={styles.inputSection}>
        <div className={styles.chartsContainer}>
          <div className={styles.subSection}>
            <h3>인원</h3>
            <div ref={chartRefs[0]} className={styles.chart} />
          </div>
          <div className={styles.subSection}>
            <h3>시간</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <div ref={chartRefs[1]} className={styles.chart} style={{ flex: 1, minWidth: '150px' }} />
              <div ref={chartRefs[2]} className={styles.chart} style={{ flex: 1, minWidth: '150px' }} />
              <div ref={chartRefs[3]} className={styles.chart} style={{ flex: 1, minWidth: '150px' }} />
            </div>
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
                <th>총인원(명)</th>
                <th>총입력시간(h)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{totalPeople}</td>
                <td>{totalTime}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <h2>조직별 업무시간 현황</h2>
      <div className={styles.headquarterSection}>
        <div className={styles.subSection}>
          <h3>선로/설계</h3>
          <div ref={chartRefs[4]} className={styles.chart} />
        </div>
        <div className={styles.subSection}>
          <h3>BIZ</h3>
          <div ref={chartRefs[5]} className={styles.chart} />
        </div>
      </div>
      <h2>분야별 현황</h2>
      <div className={styles.fieldSection}>
        <div className={styles.subSection}>
          <h3>선로</h3>
          <div ref={chartRefs[6]} className={styles.chart} />
        </div>
        <div className={styles.subSection}>
          <h3>설계</h3>
          <div ref={chartRefs[7]} className={styles.chart} />
        </div>
        <div className={styles.subSection}>
          <h3>BIZ</h3>
          <div ref={chartRefs[8]} className={styles.chart} />
        </div>
      </div>
    </div>
  );
};

export default StandardDashboard;
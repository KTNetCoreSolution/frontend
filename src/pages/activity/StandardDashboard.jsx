import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import styles from './StandardDashboard.module.css';
import chartTotalData from '../../data/standardactivity_charttotal.json';
import chartTotalData2 from '../../data/standardactivity_charttotal2.json';
import headquarterData from '../../data/standardactivity_headquarter_data.json';
import fieldworkData from '../../data/standardactivity_fieldwork_data2.json';

const StandardDashboard = () => {
  const chartRefs = Array.from({ length: 8 }, () => useRef(null)); // 1.1, 1.2, 2.1-2.3, 3.1-3.3
  const [month, setMonth] = useState('2025-08');

  const totalPeople = useMemo(() => {
    return chartTotalData.reduce((sum, item) => sum + item['입력인원(명)'], 0);
  }, []);

  const totalTime = useMemo(() => {
    return chartTotalData2.reduce((sum, item) => sum + item['입력시간(H)'], 0);
  }, []);

  useEffect(() => {
    // 1.1 Pie Donut for 인원
    if (chartRefs[0].current) {
      const chart = echarts.init(chartRefs[0].current);
      chart.setOption({
        title: {
          text: `${totalPeople}`,
          subtext: '입력인원(명)',
          left: 'center',
          top: 'center',
          textStyle: { fontSize: 24 },
          subtextStyle: { fontSize: 12 }
        },
        tooltip: {
          trigger: 'item',
          formatter: (params) => `${params.name}: ${params.percent}% / 입력인원: ${params.data.people}(명)`
        },
        series: [{
          type: 'pie',
          radius: ['40%', '70%'],
          data: chartTotalData.map(item => ({
            name: item.구분,
            value: item['비율(%)'] * 100,
            people: item['입력인원(명)']
          })),
          label: { formatter: '{b}: {d}%' },
          itemStyle: { borderRadius: 5 },
          emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } },
        }],
      });
    }

    // 1.2 Pie Donut for 시간
    if (chartRefs[1].current) {
      const chart = echarts.init(chartRefs[1].current);
      chart.setOption({
        title: {
          text: `${totalTime}`,
          subtext: '입력시간(H)',
          left: 'center',
          top: 'center',
          textStyle: { fontSize: 24 },
          subtextStyle: { fontSize: 12 }
        },
        tooltip: {
          trigger: 'item',
          formatter: (params) => `${params.name}: ${params.percent}% / 입력시간: ${params.data.time}(H)`
        },
        series: [{
          type: 'pie',
          radius: ['40%', '70%'],
          data: chartTotalData2.map(item => ({
            name: item.구분,
            value: item['비율(%)'] * 100,
            time: item['입력시간(H)']
          })),
          label: { formatter: '{b}: {d}%' },
          itemStyle: { borderRadius: 5 },
          emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } },
        }],
      });
    }

    // 2.1-2.3 Grouped Bar Charts (업무량(시간) / 100 표시, tooltip에 원본)
    const titles2 = ['선로', '설계', 'BIZ'];
    for (let i = 0; i < 3; i++) {
      if (chartRefs[i + 2].current) {
        const chart = echarts.init(chartRefs[i + 2].current);
        chart.setOption({
          tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (params) => {
              let result = `${params[0].name}<br/>`;
              params.forEach(param => {
                if (param.seriesName === '업무량(시간)') {
                  result += `${param.seriesName}: ${param.value} (원본: ${param.data * 100})<br/>`;
                } else {
                  result += `${param.seriesName}: ${param.value}<br/>`;
                }
              });
              return result;
            }
          },
          legend: { data: ['인원', '입력수', '업무량(시간)', '평균(시간)'] },
          xAxis: { type: 'category', data: headquarterData.map(item => item.본부) },
          yAxis: { type: 'value' },
          barWidth: '15%', // 바 너비 더 줄임
          series: [
            { name: '인원', type: 'bar', data: headquarterData.map(item => item.인원) },
            { name: '입력수', type: 'bar', data: headquarterData.map(item => item.입력수) },
            { name: '업무량(시간)', type: 'bar', data: headquarterData.map(item => item['업무량(시간)'] / 100) },
            { name: '평균(시간)', type: 'bar', data: headquarterData.map(item => item['평균(시간)']) },
          ],
        });
      }
    }

    // 3.1-3.3 Pie with Rich Text Label (검은색 배경 제거)
    for (let i = 0; i < 3; i++) {
      if (chartRefs[i + 5]?.current && fieldworkData[i]) {
        const chart = echarts.init(chartRefs[i + 5].current);
        const data = fieldworkData.map(item => ({
          name: item.업무 || 'Unknown',
          value: parseFloat(item['비율(%)']) || 0,
          time: item['시간(h)'] || 0
        }));
        chart.setOption({
          tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b}: {c} ({d}%)'
          },
          series: [{
            name: '업무 비율',
            type: 'pie',
            radius: [0, '60%'],
            label: {
              formatter: '{abg|{b}}\n{hr|}\n{per|{d}%}  {value|{c}시간}',
              backgroundColor: 'transparent', // 검은색 배경 제거
              borderColor: '#aaa',
              borderWidth: 1,
              borderRadius: 4,
              rich: {
                abg: {
                  backgroundColor: 'transparent', // 검은색 배경 제거
                  width: '100%',
                  align: 'center',
                  height: 25,
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

    return () => chartRefs.forEach(ref => ref.current && echarts.dispose(ref.current));
  }, [totalPeople, totalTime]);

  return (
    <div className={styles.container}>
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
            <div ref={chartRefs[1]} className={styles.chart} />
          </div>
        </div>
        <div className={styles.rightInfo}>
          <div className={styles.rightHeader}>
            <input type="month" value={month} onChange={e => setMonth(e.target.value)} className={styles.monthInput} />
            <button className={styles.refreshButton}>🔄</button>
          </div>
          <table className={styles.gridTable}>
            <thead>
              <tr>
                <th>총인원(명)</th>
                <th>총입력시간(H)</th>
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
      <h2>본부별 현황</h2>
      <div className={styles.headquarterSection}>
        <div className={styles.subSection}>
          <h3>선로</h3>
          <div ref={chartRefs[2]} className={styles.chart} />
        </div>
        <div className={styles.subSection}>
          <h3>설계</h3>
          <div ref={chartRefs[3]} className={styles.chart} />
        </div>
        <div className={styles.subSection}>
          <h3>BIZ</h3>
          <div ref={chartRefs[4]} className={styles.chart} />
        </div>
      </div>
      <h2>분야별 현황</h2>
      <div className={styles.fieldSection}>
        <div className={styles.subSection}>
          <h3>선로</h3>
          <div ref={chartRefs[5]} className={styles.chart} />
        </div>
        <div className={styles.subSection}>
          <h3>설계</h3>
          <div ref={chartRefs[6]} className={styles.chart} />
        </div>
        <div className={styles.subSection}>
          <h3>BIZ</h3>
          <div ref={chartRefs[7]} className={styles.chart} />
        </div>
      </div>
    </div>
  );
};

export default StandardDashboard;
import React, { useState, useEffect, useRef } from 'react';
import { Modal } from 'react-bootstrap';
import StandardFieldWorkStatisticsPopup from './popup/StandardFieldWorkStatisticsPopup';
import StandardOrgWorkStatisticsPopup from './popup/StandardOrgWorkStatisticsPopup';
import * as echarts from 'echarts';
import { fetchJsonData } from '../../utils/dataUtils';
import styles from './StandardStatistics.module.css';
import standardActivityHeadquarterData from '../../data/standardactivity_headquarter_data.json';
import standardActivityFieldworkData from '../../data/standardactivity_fieldwork_data.json';

const StandardStatistics = () => {
  const [headquarterData, setHeadquarterData] = useState([]);
  const [fieldworkData, setFieldworkData] = useState([]);
  const [chartData1, setChartData1] = useState([]);
  const [chartData2, setChartData2] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [selectedWorkHours, setSelectedWorkHours] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filters, setFilters] = useState({ biz: true, 설계: true, 선로: true });

  // 차트용 ref
  const chartRef1 = useRef(null);
  const chartRef2 = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const headquarterResult = await fetchJsonData(standardActivityHeadquarterData, {});
        setHeadquarterData(Array.isArray(headquarterResult) ? headquarterResult : []);

        const fieldworkResult = await fetchJsonData(standardActivityFieldworkData, {});
        setFieldworkData(Array.isArray(fieldworkResult) ? fieldworkResult : []);

        setChartData1([
          { name: '기술총괄', value: 101718.2 },
          { name: '강북본부', value: 37725.0 },
          { name: '강남본부', value: 23805.0 },
        ]);
        setChartData2([
          { name: '설계', value: 400 },
          { name: '운영', value: 300 },
          { name: '유지보수', value: 200 },
          { name: '지원', value: 100 },
        ]);
      } catch (err) {
        console.error('데이터 로드 실패:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // ECharts 초기화
  useEffect(() => {
    if (chartData1.length > 0 && chartRef1.current) {
      const chartInstance1 = echarts.init(chartRef1.current);
      chartInstance1.setOption({
        title: { text: '본부별 분포', left: 'center' },
        tooltip: { trigger: 'item' },
        legend: { orient: 'vertical', right: 10, top: 'center' },
        series: [
          {
            type: 'pie',
            radius: '60%',
            data: chartData1,
            label: { formatter: '{b}: {d}%' },
            emphasis: {
              itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' },
            },
          },
        ],
      });
    }

    if (chartData2.length > 0 && chartRef2.current) {
      const chartInstance2 = echarts.init(chartRef2.current);
      chartInstance2.setOption({
        title: { text: '분야별 분포', left: 'center' },
        tooltip: { trigger: 'item' },
        legend: { orient: 'vertical', right: 10, top: 'center' },
        series: [
          {
            type: 'pie',
            radius: '60%',
            data: chartData2,
            label: { formatter: '{b}: {d}%' },
            emphasis: {
              itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' },
            },
          },
        ],
      });
    }

    return () => {
      if (chartRef1.current) echarts.dispose(chartRef1.current);
      if (chartRef2.current) echarts.dispose(chartRef2.current);
    };
  }, [chartData1, chartData2]);

  const handleWorkHoursClick = (workHours, isFieldWork) => {
    setSelectedWorkHours(workHours);
    if (isFieldWork) {
      setShowFieldModal(true);
    } else {
      setShowOrgModal(true);
    }
  };

  const handleCloseOrgModal = () => setShowOrgModal(false);
  const handleCloseFieldModal = () => setShowFieldModal(false);

  const mergedFieldworkData = fieldworkData.reduce((acc, item) => {
    const key = item['본부'] || '기타';
    if (!acc[key]) {
      acc[key] = { 대분류: key, 중분류: item['센터/부'] || '기타', '업무량(시간)': 0 };
    }
    acc[key]['업무량(시간)'] += item['업무량(시간)'] || 0;
    return acc;
  }, {});

  return (
    <div className={styles.container}>
      <div className="row">
        <div className="col-md-6">
          <div className={styles.leftPanel}>
            <div className="card">
              <div className="card-header text-center">본부별 업무 현황</div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-bordered">
                    <thead className={styles.stickyTop}>
                      <tr>
                        <th className="text-center">본부</th>
                        <th className="text-center">인원</th>
                        <th className="text-center">입력수</th>
                        <th className="text-center">업무량(시간)</th>
                        <th className="text-center">평균(시간)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan="5" className="text-center">로딩 중...</td></tr>
                      ) : headquarterData.length > 0 ? (
                        headquarterData.map((row, index) => (
                          <tr key={index}>
                            <td className="text-center">{row.본부}</td>
                            <td className="text-center">{row.인원}</td>
                            <td className="text-center">{row.입력수}</td>
                            <td
                              className="text-center"
                              style={{ cursor: 'pointer', color: 'blue' }}
                              onClick={() => handleWorkHoursClick(row['업무량(시간)'], false)}
                            >
                              {row['업무량(시간)']}
                            </td>
                            <td className="text-center">{row['평균(시간)']}</td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan="5" className="text-center">데이터 없음</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-header text-center">분류별 챠트분석</div>
              <div className="card-body">
                <div className={styles.chartWrapper}>
                  <div ref={chartRef1} style={{ width: '48%', height: 250 }}></div>
                  <div ref={chartRef2} style={{ width: '48%', height: 250 }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className={styles.rightPanel}>
            <div className="card" style={{ height: '100%' }}>
              <div className="card-header text-center">분야별 업무 현황</div>
              <div className="card-body">
                <div className="d-flex align-items-center mb-3">
                  <div className="input-group" style={{ width: '200px' }}>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                    <span className="input-group-text">~</span>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  <div className="ms-3">
                    {Object.keys(filters).map((key) => (
                      <div className="form-check form-check-inline" key={key}>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={key}
                          checked={filters[key]}
                          onChange={() => setFilters({ ...filters, [key]: !filters[key] })}
                        />
                        <label className="form-check-label" htmlFor={key}>{key}</label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="table-responsive" style={{ maxHeight: 'calc(50vh - 200px)' }}>
                  <table className="table table-bordered">
                    <thead className={styles.stickyTop}>
                      <tr>
                        <th className="text-center">대분류</th>
                        <th className="text-center">중분류</th>
                        <th className="text-center">업무량(시간)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan="3" className="text-center">로딩 중...</td></tr>
                      ) : Object.values(mergedFieldworkData).length > 0 ? (
                        Object.values(mergedFieldworkData).map((row, index) => (
                          <tr key={index}>
                            <td className="text-center">{row.대분류}</td>
                            <td className="text-center">{row.중분류}</td>
                            <td
                              className="text-center"
                              style={{ cursor: 'pointer', color: 'blue' }}
                              onClick={() => handleWorkHoursClick(row['업무량(시간)'], true)}
                            >
                              {row['업무량(시간)']}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan="3" className="text-center">데이터 없음</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <StandardOrgWorkStatisticsPopup show={showOrgModal} onHide={handleCloseOrgModal} workHours={selectedWorkHours} />
      <StandardFieldWorkStatisticsPopup show={showFieldModal} onHide={handleCloseFieldModal} workHours={selectedWorkHours} />
    </div>
  );
};

export default StandardStatistics;

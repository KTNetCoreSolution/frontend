import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../../store/store';
import { hasPermission } from '../../utils/authUtils';
import MainSearch from '../../components/main/MainSearch';
import TableSearch from '../../components/table/TableSearch';
import { createTable } from '../../utils/tableConfig';
import { initialFilters } from '../../utils/tableEvent';
import { handleDownloadExcel } from '../../utils/tableExcel';
import { fetchData } from '../../utils/dataUtils';
import { msgPopup } from '../../utils/msgPopup';
import styles from '../../components/table/TableSearch.module.css';
import { errorMsgPopup } from '../../utils/errorMsgPopup';
import common from '../../utils/common';
import StandardOrgClassStatisticPopup from './popup/StandardOrgClassStatisticPopup';
import StandardOrgStatisticPopup from './popup/StandardOrgStatisticPopup';

const fn_CellNumber = { editor: 'number', editorParams: { min: 0 }, editable: true };

// getFieldOptions 함수
const getFieldOptions = (fieldId) => {
  if (fieldId === 'filterSelect') {
    return [
      { value: '', label: '선택' },
      { value: 'ORGNM', label: '조직' },
    ];
  }
  if (fieldId === 'dayGubun') {
    return [
      { value: 'M', label: '월' },
      { value: 'D', label: '일' },
    ];
  }
  return [];
};

const filterTableFields = [
  { id: 'filterSelect', type: 'select', label: '', options: getFieldOptions('filterSelect'), width: '150px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true },
  { id: 'filterText', type: 'text', label: '', placeholder: '찾을 내용을 입력하세요', width: '200px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true },
];

// 기본 컬럼 정의
const baseColumns = [
  { headerHozAlign: 'center', hozAlign: 'center', title: 'No', field: 'ID', sorter: 'number', width: 60, frozen: true },
  { headerHozAlign: 'center', hozAlign: 'center', title: '업무분야코드', field: 'SECTIONCD', sorter: 'string', width: 100, visible: false },
  { headerHozAlign: 'center', hozAlign: 'center', title: '업무분야', field: 'SECTIONNM', sorter: 'string', width: 100 },
  { headerHozAlign: 'center', hozAlign: 'center', title: '인원', field: 'EMPNOCNT', sorter: 'number', width: 100 },
  {
    headerHozAlign: 'center',
    hozAlign: 'center',
    title: '조직',
    field: 'ORGNM',
    sorter: 'string',
    width: 130,
    formatter: (cell) => {
      const value = cell.getValue();
      if (value) {
        cell.getElement().style.color = '#247db3';
        cell.getElement().style.cursor = 'pointer';
      } else {
        cell.getElement().style.color = '#000000';
        cell.getElement().style.cursor = 'default';
      }
      return value || '';
    },
    cellClick: (e, cell, setSelectedOrgData, setShowOrgStatisticPopup, user) => {
      const value = cell.getValue();
      const rowData = cell.getRow().getData();
      if (value) {
        setSelectedOrgData({
          ...rowData,
          SECTIONCD: rowData.SECTIONCD || '',
          EMPNO: rowData.EMPNO || user?.empNo || '',
          ORGCD: rowData.ORGCD || '',
          ORGLEVELGB: rowData.pORGLEVELGB || '',
          ORGLEVEL: rowData.ORGLEVEL || '',
          DATEGB: rowData.pDATEGB || '',
          DATE1: rowData.pDATE1 || '',
          DATE2: rowData.pDATE2 || '',
          CLASSCD: rowData.CLASSCD || '',
        });
        setShowOrgStatisticPopup(true);
      }
    },
  },
  { headerHozAlign: 'center', hozAlign: 'center', title: '조직코드', field: 'ORGCD', sorter: 'string', width: 130, visible: false },
  { headerHozAlign: 'center', hozAlign: 'center', title: '조회일자구분', field: 'pDATEGB', sorter: 'string', width: 100, visible: false },
  { headerHozAlign: 'center', hozAlign: 'center', title: '조회일자1', field: 'pDATE1', sorter: 'string', width: 100, visible: false },
  { headerHozAlign: 'center', hozAlign: 'center', title: '조회일자2', field: 'pDATE2', sorter: 'string', width: 100, visible: false },
  { headerHozAlign: 'center', hozAlign: 'center', title: '조회조직레벨구분', field: 'pORGLEVELGB', sorter: 'string', width: 100, visible: false },
  { headerHozAlign: 'center', hozAlign: 'center', title: '조직레벨', field: 'ORGLEVEL', sorter: 'string', width: 100, visible: false },
];

const StandardOrgStatistic = () => {
  const { user } = useStore();
  const navigate = useNavigate();
  const today = common.getTodayDate();
  const [filters, setFilters] = useState({
    classGubun: user?.standardSectionCd || 'LINE',
    classGubunTxt: user?.standardSectionCd === 'LINE' ? '선로' : user?.standardSectionCd === 'DESIGN' ? '설계' : user?.standardSectionCd === 'BIZ' ? 'BIZ' : '선로',
    dayGubun: 'M',
    monthDate: today.substring(0, 7),
    rangeStartDate: today,
    rangeEndDate: today,
    CLASSCD: '',
  });
  const [tableFilters, setTableFilters] = useState({});
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [isSearched, setIsSearched] = useState(false);
  const [tableStatus, setTableStatus] = useState('initializing');
  const [rowCount, setRowCount] = useState(0);
  const tableRef = useRef(null);
  const tableInstance = useRef(null);
  const isInitialRender = useRef(true);
  const [showStatisticPopup, setShowStatisticPopup] = useState(false);
  const [showOrgStatisticPopup, setShowOrgStatisticPopup] = useState(false);
  const [selectedData, setSelectedData] = useState(null);
  const [selectedOrgData, setSelectedOrgData] = useState(null); // 수정: 상태 정의 확인
  const [dynamicColumns, setDynamicColumns] = useState([]);

    // ORGNM 컬럼에 상태 전달
  const updatedBaseColumns = baseColumns.map((column) => {
    if (column.field === 'ORGNM') {
      return {
        ...column,
        cellClick: (e, cell) => column.cellClick(e, cell, setSelectedOrgData, setShowOrgStatisticPopup, user),
      };
    }
    return column;
  });

  // 초기 searchConfig 설정
  const baseSearchConfig = {
    areas: [
      {
        type: 'search',
        fields: [
          { id: 'classGubunLbl', type: 'label', row: 1, label: '분야', labelVisible: false, enabled: true },
          ...(hasPermission(user?.auth, 'oper')
            ? [{ id: 'classGubun', type: 'select', row: 1, label: '분야', labelVisible: false, options: [{ value: 'LINE', label: '선로' }, { value: 'DESIGN', label: '설계' }, { value: 'BIZ', label: 'BIZ' }], defaultValue: 'LINE', enabled: true }]
            : user?.standardSectionCd === 'LINE'
              ? [{ id: 'classGubunTxt', type: 'text', row: 1, label: '분야', defaultValue: '선로', labelVisible: false, enabled: true }]
              : user?.standardSectionCd === 'DESIGN'
                ? [{ id: 'classGubunTxt', type: 'text', row: 1, label: '분야', defaultValue: '설계', labelVisible: false, enabled: true }]
                : user?.standardSectionCd === 'BIZ'
                  ? [{ id: 'classGubunTxt', type: 'text', row: 1, label: '분야', defaultValue: 'BIZ', labelVisible: false, enabled: true }]
                  : []),
          { id: 'dayGubunLbl', type: 'label', row: 1, label: '작업', labelVisible: false, enabled: true },
          { id: 'dayGubun', type: 'select', row: 1, label: '', labelVisible: false, options: getFieldOptions('dayGubun'), defaultValue: 'M', enabled: true },
          { id: 'monthDate', type: 'month', row: 1, width: '74px', label: '', labelVisible: true, placeholder: '월 선택', enabled: false, defaultValue: today.substring(0, 7) },
          { id: 'rangeStartDate', type: 'startday', row: 1, width: '100px', label: '', labelVisible: true, placeholder: '시작일 선택', enabled: false, defaultValue: today },
          { id: 'rangeEndDate', type: 'endday', row: 1, width: '100px', label: ' ~ ', labelVisible: true, placeholder: '종료일 선택', enabled: false, defaultValue: today },
        ],
      },
      {
        type: 'buttons',
        fields: [
          { id: 'searchBtn', type: 'button', row: 1, label: '검색', eventType: 'search', enabled: true },
        ],
      },
    ],
  };

  const [searchConfig, setSearchConfig] = useState(baseSearchConfig);

  useEffect(() => {
    setSearchConfig((prev) => {
      const newAreas = prev.areas.map((area) => {
        if (area.type !== 'search') return area;
        const baseFields = baseSearchConfig.areas.find((a) => a.type === 'search').fields;
        const newFields = baseFields.filter((field) => {
          if (filters.dayGubun === 'M') {
            return field.id !== 'rangeStartDate' && field.id !== 'rangeEndDate';
          } else if (filters.dayGubun === 'D') {
            return field.id !== 'monthDate';
          }
          return true;
        });
        return { ...area, fields: newFields };
      });
      return { ...prev, areas: newAreas };
    });
  }, [filters.dayGubun]);

  // filters 초기화
  useEffect(() => {
    setFilters((prev) => {
      const searchArea = searchConfig.areas.find((area) => area.type === 'search');
      const searchFields = searchArea ? searchArea.fields : [];
      const dateFilters = {};
      searchFields.forEach((field) => {
        if (['day', 'startday', 'endday'].includes(field.type) && prev[field.id] === undefined) {
          dateFilters[field.id] = field.defaultValue || today;
        } else if (['month', 'startmonth', 'endmonth'].includes(field.type) && prev[field.id] === undefined) {
          dateFilters[field.id] = field.defaultValue || today.substring(0, 7);
        }
      });
      return {
        ...prev,
        ...dateFilters,
        dayGubun: prev.dayGubun || 'M',
        monthDate: prev.monthDate || today.substring(0, 7),
        rangeStartDate: prev.rangeStartDate || today,
        rangeEndDate: prev.rangeEndDate || today,
        CLASSCD: prev.CLASSCD || '',
      };
    });
    setTableFilters(initialFilters(filterTableFields));
  }, [searchConfig, today]);

  const loadData = async () => {
    setLoading(true);
    setIsSearched(true);
    try {
      const params = {
        pSECTIONCD: hasPermission(user?.auth, 'oper')
          ? filters.classGubun
          : user?.standardSectionCd === 'LINE'
            ? 'LINE'
            : user?.standardSectionCd === 'DESIGN'
              ? 'DESIGN'
              : user?.standardSectionCd === 'BIZ'
                ? 'BIZ'
                : 'LINE',
        pEMPNO: user?.empNo || '',
        pORGCD: '',
        pORGLEVELGB: '1',
        pDATEGB: filters.dayGubun,
        pDATE1: filters.dayGubun === 'D' ? filters.rangeStartDate : filters.dayGubun === 'M' ? filters.monthDate : '',
        pDATE2: filters.dayGubun === 'D' ? filters.rangeEndDate : filters.dayGubun === 'M' ? filters.monthDate : '',
        pCLASSCD: filters.CLASSCD,
        pDEBUG: 'F',
      };

      // 첫 번째 호출: classData (pGUBUN: 'COLLIST')
      const classResponse = await fetchData('standard/orgStatistic/list', {
        pGUBUN: 'COLLIST',
        ...params,
      });
      if (!classResponse.success) {
        errorMsgPopup(classResponse.message || '클래스 데이터를 가져오는 중 오류가 발생했습니다.');
        return;
      }

      // 동적 컬럼 생성
      const classData = Array.isArray(classResponse.data) ? classResponse.data : [];
      const newDynamicColumns = classData.map(({ CLASSACD, CLASSANM }) => ({
        headerHozAlign: 'center',
        hozAlign: 'center',
        title: CLASSANM,
        field: CLASSACD,
        sorter: 'number',
        width: 200,
        visible: true,
        formatter: (cell) => {
          const value = Number(cell.getValue());
          if (!isNaN(value) && value > 0) {
            cell.getElement().style.color = '#247db3';
            cell.getElement().style.cursor = 'pointer';
          } else {
            cell.getElement().style.color = '#000000';
            cell.getElement().style.cursor = 'default';
          }
          return value || '';
        },
        cellClick: (e, cell) => {
          const field = cell.getField();
          const rowData = cell.getRow().getData();
          const value = Number(rowData[field]);
          if (!isNaN(value) && value > 0) {
            setSelectedData({
              ...rowData,
              CLASSCD: field,
              SECTIONCD: rowData.SECTIONCD || '',
              DATEGB: rowData.pDATEGB || '',
              DATE1: rowData.pDATE1 || '',
              DATE2: rowData.pDATE2 || '',
              EMPNO: rowData.EMPNO || user?.empNo || '',
              ORGCD: rowData.ORGCD || '',
              ORGLEVELGB: rowData.pORGLEVELGB || '',
            });
            setShowStatisticPopup(true);
          }
        },
      }));
      setDynamicColumns(newDynamicColumns);

      // 두 번째 호출: mainData (pGUBUN: 'LIST')
      const mainResponse = await fetchData('standard/orgStatistic/list', {
        pGUBUN: 'LIST',
        ...params,
      });
      if (!mainResponse.success) {
        errorMsgPopup(mainResponse.message || '데이터를 가져오는 중 오류가 발생했습니다.');
        return;
      }
      const mainData = Array.isArray(mainResponse.data) ? mainResponse.data : [];

      // 데이터에 고유 ID 추가
      const processedData = mainData.map((row, index) => ({
        ...row,
        ID: index + 1,
      }));

      setData(processedData);

      // 테이블 컬럼 및 데이터 갱신
      if (tableInstance.current && tableStatus === 'ready') {
        const updatedColumns = [...updatedBaseColumns, ...newDynamicColumns];
        tableInstance.current.setColumns(updatedColumns);
        tableInstance.current.setData(processedData);
      } else {
        console.warn('테이블이 준비되지 않았습니다. 상태:', tableStatus);
      }
    } catch (err) {
      console.error('데이터 로드 실패:', err);
      errorMsgPopup('데이터를 가져오는 중 오류가 발생했습니다.');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // user 로딩 대기 및 리디렉션 처리
  useEffect(() => {
    if (user === null) return;
    if (!user) navigate('/');
  }, [user, navigate]);

  useEffect(() => {
    const initializeTable = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (!tableRef.current) {
        console.warn('테이블 컨테이너가 준비되지 않았습니다.');
        return;
      }

      try {
        tableInstance.current = createTable(tableRef.current, updatedBaseColumns, data, {
          headerHozAlign: 'center',
          layout: 'fitColumns',
        });
        if (!tableInstance.current) throw new Error('createTable returned undefined or null');
        setTableStatus('ready');
      } catch (err) {
        setTableStatus('error');
        console.error('Table initialization failed:', err.message);
      }
    };
    initializeTable();
    return () => {
      if (tableInstance.current) {
        tableInstance.current.destroy();
        tableInstance.current = null;
        setTableStatus('initializing');
      }
    };
  }, []);

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    const table = tableInstance.current;
    if (!table || tableStatus !== 'ready' || loading) return;
    if (table.rowManager?.renderer) {
      table.setData(data);
      if (isSearched && data.length === 0 && !loading) {
        tableInstance.current.alert('검색 결과 없음', 'info');
      } else {
        tableInstance.current.clearAlert();
        setRowCount(tableInstance.current.getDataCount());
      }
    } else {
      console.warn('renderer가 아직 초기화되지 않았습니다.');
    }
  }, [data, loading, tableStatus, isSearched]);

  useEffect(() => {
    if (isInitialRender.current || !tableInstance.current || tableStatus !== 'ready' || loading) return;
    const { filterSelect, filterText } = tableFilters;
    if (filterText && filterSelect) {
      tableInstance.current.setFilter(filterSelect, 'like', filterText);
    } else if (filterText) {
      if (filterText !== '') {
        tableInstance.current.setFilter([{ field: 'ORGNM', type: 'like', value: filterText }], 'or');
      } else {
        tableInstance.current.clearFilter();
      }
    } else if (filterSelect) {
      tableInstance.current.clearFilter();
    }
  }, [tableFilters.filterSelect, tableFilters.filterText, tableStatus, loading]);

  const handleDynamicEvent = (eventType, payload) => {
    if (eventType === 'search') {
      loadData();
    } else if (eventType === 'selectChange') {
      const { id, value } = payload;
      setFilters((prev) => {
        const newFilters = { ...prev, [id]: value };
        if (id === 'dayGubun') {
          newFilters.monthDate = value === 'M' ? today.substring(0, 7) : '';
          newFilters.rangeStartDate = value === 'D' ? today : '';
          newFilters.rangeEndDate = value === 'D' ? today : '';
        }
        return newFilters;
      });
    }
  };

  if (user === null) {
    return <div>사용자 정보 로드 중...</div>;
  }

  return (
    <div className='container'>
      <MainSearch
        config={searchConfig}
        filters={filters}
        setFilters={setFilters}
        onEvent={handleDynamicEvent}
      />
      <TableSearch
        filterFields={filterTableFields}
        filters={tableFilters}
        setFilters={setTableFilters}
        rowCount={rowCount}
        onDownloadExcel={() => handleDownloadExcel(tableInstance.current, tableStatus, '조직별현황.xlsx')}
        buttonStyles={styles}
      />
      <div className={styles.tableWrapper}>
        {tableStatus === 'initializing' && <div>초기화 중...</div>}
        {loading && <div>로딩 중...</div>}
        <div ref={tableRef} className={styles.tableSection} style={{ visibility: loading || tableStatus !== 'ready' ? 'hidden' : 'visible' }} />
      </div>
      <StandardOrgClassStatisticPopup
        show={showStatisticPopup}
        onHide={() => setShowStatisticPopup(false)}
        data={selectedData ? [selectedData] : []}
      />
      <StandardOrgStatisticPopup
        show={showOrgStatisticPopup}
        onHide={() => setShowOrgStatisticPopup(false)}
        data={selectedOrgData ? [selectedOrgData] : []}
        dynamicColumns={dynamicColumns} // 추가: 동적 컬럼 전달
      />
    </div>
  );
};

export default StandardOrgStatistic;
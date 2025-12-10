import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../../store/store';
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

const getFieldOptions = (fieldId) => {
  if (fieldId === 'filterSelect') {
    return [
      { value: '', label: '선택' },
      { value: 'EMPNM', label: '등록자' },
      { value: 'UPLOADNAME', label: '업로드명' },
      { value: 'MESSAGE', label: '메시지' },
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

const ExcelUploadResultHistory = () => {
  const { user } = useStore();
  const navigate = useNavigate();
  const today = common.getTodayDate();
  const [filters, setFilters] = useState({
    dayGubun: 'M',
    monthDate: today.substring(0, 7),
    rangeStartDate: today,
    rangeEndDate: today,
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

  const baseSearchConfig = {
    areas: [
      {
        type: 'search',
        fields: [
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

  useEffect(() => {
    setFilters((prev) => {
      const searchFields = searchConfig.areas.find((area) => area.type === 'search')?.fields || [];
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
      };
    });
    setTableFilters(initialFilters(filterTableFields));
  }, [searchConfig]);

  // 새 컬럼 정의
  const columns = [
    { headerHozAlign: 'center', hozAlign: 'center', title: '순번', field: 'ID', sorter: 'number', width: 80, frozen: true },
    { headerHozAlign: 'center', hozAlign: 'center', title: '업로드일', field: 'UPLOADDT', sorter: 'string', width: 110, frozen: true },
    { headerHozAlign: 'center', hozAlign: 'center', title: '업로드월', field: 'UPLOAD_MON', sorter: 'string', width: 100, visible:false },
    { headerHozAlign: 'center', hozAlign: 'center', title: '보고서코드', field: 'RPTCD', sorter: 'string', width: 200 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '업로드명', field: 'UPLOADNAME', sorter: 'string', width: 250 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '사원번호', field: 'EMPNO', sorter: 'string', width: 100 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '등록자', field: 'EMPNM', sorter: 'string', width: 100 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '결과', field: 'RESULTYN', sorter: 'string', width: 80,
      formatter: (cell) => {
        const value = cell.getValue();
        return value === 'Y' ? '<span style="color:green;font-weight:bold;">성공</span>' :
               value === 'N' ? '<span style="color:red;font-weight:bold;">실패</span>' : value;
      }
    },
    { headerHozAlign: 'center', hozAlign: 'right', title: '총건수', field: 'TOT_CNT', sorter: 'number', width: 100 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '등록일시', field: 'DBCREATEDT', sorter: 'string', width: 160 },
    { headerHozAlign: 'center', hozAlign: 'left', title: '메시지', field: 'MESSAGE', sorter: 'string', width: 500 },
  ];

  const loadData = async () => {
    setLoading(true);
    setIsSearched(true);

    try {
      const params = {
        pGUBUN: 'LIST',
        pEMPNO: user?.empNo || '',
        pDATEGB: filters.dayGubun,
        pDATE1: filters.dayGubun === 'D' ? filters.rangeStartDate : filters.monthDate,
        pDATE2: filters.dayGubun === 'D' ? filters.rangeEndDate : filters.monthDate,
        pDEBUG: 'F',
      };

      const response = await fetchData('excelupload/result/list', params);
      if (!response.success) {
        errorMsgPopup(response.message || '데이터를 가져오는 중 오류가 발생했습니다.');
        setData([]);
        return;
      }

      const responseData = Array.isArray(response.data) ? response.data : [];
      setData(responseData);
      setRowCount(responseData.length);
    } catch (err) {
      console.error('데이터 로드 실패:', err);
      errorMsgPopup('데이터를 가져오는 중 오류가 발생했습니다.');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user === null) return;
    if (!user) navigate('/');
  }, [user, navigate]);

  useEffect(() => {
    const initializeTable = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (!tableRef.current) {
        console.warn('테이블 컨테이너가 준비되지 않았습니다.');
        setTableStatus('error');
        return;
      }
      try {
        tableInstance.current = createTable(tableRef.current, columns, [], {
          headerHozAlign: 'center',
          layout: 'fitColumns',
          reactiveData: true,
          index: 'ID',
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
    if (!tableInstance.current || tableStatus !== 'ready' || loading) return;

    tableInstance.current.setData(data);
    if (isSearched && data.length === 0 && !loading) {
      tableInstance.current.alert('검색 결과 없음', 'info');
      setRowCount(0);
    } else {
      tableInstance.current.clearAlert();
      setRowCount(tableInstance.current.getDataCount());
    }
  }, [data, tableStatus, loading, isSearched]);

  useEffect(() => {
    if (isInitialRender.current || !tableInstance.current || tableStatus !== 'ready' || loading) return;

    const { filterSelect, filterText } = tableFilters;

    if (filterText && filterSelect) {
      tableInstance.current.setFilter(filterSelect, 'like', filterText);
    } else if (filterText) {
      if (filterText !== '') {
        tableInstance.current.setFilter([
          { field: 'EMPNM', type: 'like', value: filterText },
          { field: 'UPLOADNAME', type: 'like', value: filterText },
          { field: 'MESSAGE', type: 'like', value: filterText },
        ], 'or');
      } else {
        tableInstance.current.clearFilter();
      }
    } else {
      tableInstance.current.clearFilter();
    }
    setRowCount(tableInstance.current.getDataCount());
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
        onDownloadExcel={() => handleDownloadExcel(tableInstance.current, tableStatus, '엑셀업로드결과이력.xlsx')}
        buttonStyles={styles}
      />
      <div className={styles.tableWrapper}>
        {tableStatus === 'initializing' && <div>초기화 중...</div>}
        {loading && <div>로딩 중...</div>}
        <div
          ref={tableRef}
          className={styles.tableSection}
          style={{ visibility: loading || tableStatus !== 'ready' ? 'hidden' : 'visible' }}
        />
      </div>
    </div>
  );
};

export default ExcelUploadResultHistory;
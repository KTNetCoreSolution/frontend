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

const fn_CellNumber = { editor: 'number', editorParams: { min: 0 }, editable: true };

// 삭제 버튼 생성 함수 (ExcelUploadTemplateManage.jsx 참조)
const fn_CellButton = (label, className, onClick) => ({
  formatter: (cell) => {
    const button = document.createElement("button");
    button.className = `btn btn-sm ${className}`;
    button.innerText = label;
    button.onclick = () => onClick(cell.getData());
    return button;
  },
});

// getFieldOptions 함수
const getFieldOptions = (fieldId) => {
  if (fieldId === 'filterSelect') {
    return [
      { value: '', label: '선택' },
      { value: 'EMPNM', label: '팀원' },
      { value: 'CLASSANM', label: '대분류' },
      { value: 'CLASSBNM', label: '중분류' },
      { value: 'CLASSCNM', label: '소분류' },
      { value: 'WORKNM', label: '근무형태' },
    ];
  }
  return [];
};

const filterTableFields = [
  { id: 'filterSelect', type: 'select', label: '', options: getFieldOptions('filterSelect'), width: '150px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true },
  { id: 'filterText', type: 'text', label: '', placeholder: '찾을 내용을 입력하세요', width: '200px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true },
];

const StandardTeamJobManage = () => {
  const { user } = useStore();
  const navigate = useNavigate();
  const today = common.getTodayDate();
  const [filters, setFilters] = useState({
    classGubun: user?.standardSectionCd || 'LINE',
    classGubunTxt: user?.standardSectionCd === 'LINE' ? '선로' : user?.standardSectionCd === 'DESIGN' ? '설계' : user?.standardSectionCd === 'BIZ' ? 'BIZ' : '선로',
    rangeStartDate: today,
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

  // 초기 searchConfig 설정
  const searchConfig = {
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
          { id: 'rangeStartDate', type: 'day', row: 1, width: '100px', label: '', labelVisible: true, placeholder: '시작일 선택', enabled: true, defaultValue: today },
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

  // filters 초기화
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      rangeStartDate: prev.rangeStartDate || today,
    }));
    setTableFilters(initialFilters(filterTableFields));
  }, [today]);

  const columns = [
    { headerHozAlign: 'center', hozAlign: 'center', title: 'No', field: 'ID', sorter: 'number', width: 60, frozen: true },
    { headerHozAlign: 'center', hozAlign: 'center', title: '기준일자', field: 'DDATE', sorter: 'string', width: 100, frozen: true },
    { 
      headerHozAlign: 'center', 
      hozAlign: 'center', 
      title: '팀원', 
      field: 'EMPNM', 
      sorter: 'string', 
      width: 100, 
      frozen: true,
      cellClick: (e, cell) => { msgPopup(cell.getValue() + ' 팝업 준비중'); },
      cellStyle: { color: '#247db3' }
    },
    { headerHozAlign: 'center', hozAlign: 'center', title: '대분류', field: 'CLASSANM', sorter: 'string', width: 180 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '중분류', field: 'CLASSBNM', sorter: 'string', width: 180 },
    { headerHozAlign: 'center', hozAlign: 'left', title: '소분류', field: 'CLASSCNM', sorter: 'string', width: 220 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '건(구간/본/개소)', field: 'WORKCNT', sorter: 'number', width: 130, ...fn_CellNumber },
    { headerHozAlign: 'center', hozAlign: 'center', title: '근무형태코드', field: 'WORKCD', sorter: 'string', width: 100, visible: false },
    { headerHozAlign: 'center', hozAlign: 'center', title: '근무형태', field: 'WORKNM', sorter: 'string', width: 100 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '작업시간', field: 'WORKDT', sorter: 'string', width: 100 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '업무량(시간)', field: 'WORKH', sorter: 'number', width: 120, ...fn_CellNumber },
    { 
      headerHozAlign: 'center', 
      hozAlign: 'center', 
      title: '', 
      field: 'actions', 
      width: 80, 
      formatter: (cell) => {
        const rowData = cell.getRow().getData();
        if (rowData.DELYN === 'Y') {
          return fn_CellButton('삭제', `btn-danger ${styles.deleteButton}`, (rowData) => {
            msgPopup(`${rowData.EMPNM} 삭제 예정입니다.`);
          }).formatter(cell);
        }
        return null;
      }
    },
  ];

  const loadData = async () => {
    setLoading(true);
    setIsSearched(true);
    try {
      const params = {
        pGUBUN: 'LIST',
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
        pDATE1: filters.rangeStartDate,
        pDEBUG: 'F',
      };

      const response = await fetchData('standard/teamJob/list', params);
      if (!response.success) {
        errorMsgPopup(response.message || '데이터를 가져오는 중 오류가 발생했습니다.');
        return;
      }
      const responseData = Array.isArray(response.data) ? response.data : [];
      setData(responseData);
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
    if (user === null) return; // user가 로드되기 전에는 아무 작업도 하지 않음
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
        tableInstance.current = createTable(tableRef.current, columns, [], {
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
        tableInstance.current.setFilter([
          { field: 'EMPNM', type: 'like', value: filterText },
          { field: 'WORKNM', type: 'like', value: 'filterText' },
        ], 'or');
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
      setFilters((prev) => ({ ...prev, [payload.id]: payload.value }));
    }
  };

  // user가 로드되기 전에는 로딩 상태 표시
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
        onDownloadExcel={() => handleDownloadExcel(tableInstance.current, tableStatus, '팀별업무관리.xlsx')}
        buttonStyles={styles}
      />
      <div className={styles.tableWrapper}>
        {tableStatus === 'initializing' && <div>초기화 중...</div>}
        {loading && <div>로딩 중...</div>}
        <div ref={tableRef} className={styles.tableSection} style={{ visibility: loading || tableStatus !== 'ready' ? 'hidden' : 'visible' }} />
      </div>
    </div>
  );
};

export default StandardTeamJobManage;
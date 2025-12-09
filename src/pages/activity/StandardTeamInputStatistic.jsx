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
import StandardTeamOrgDayStatisticPopup from './popup/StandardTeamOrgDayStatisticPopup';
import StandardTeamInputEmpStatisticPopup from './popup/StandardTeamInputEmpStatisticPopup';
import OrgSearchPopup from '../../components/popup/OrgSearchPopup'; // 추가: 조직 선택 팝업

const fn_CellNumber = { editor: 'number', editorParams: { min: 0 }, editable: true };

// getFieldOptions 함수
const getFieldOptions = (fieldId) => {
  if (fieldId === 'filterSelect') {
    return [
      { value: '', label: '선택' },
      { value: 'ORGNM', label: '팀정보' },
    ];
  }
  return [];
};

const filterTableFields = [
  { id: 'filterSelect', type: 'select', label: '', options: getFieldOptions('filterSelect'), width: '150px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true },
  { id: 'filterText', type: 'text', label: '', placeholder: '찾을 내용을 입력하세요', width: '200px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true },
];

const StandardTeamInputStatistic = () => {
  const { user } = useStore();
  const navigate = useNavigate();
  const today = common.getTodayDate();
  const [filters, setFilters] = useState({
    classGubun: user?.standardSectionCd || 'LINE',
    classGubunTxt: user?.standardSectionCd === 'LINE' ? '선로' : user?.standardSectionCd === 'DESIGN' ? '설계' : user?.standardSectionCd === 'BIZ' ? 'BIZ' : '선로',
    monthDate: today.substring(0, 7),
    ORGCD: user?.orgCd || '', // 추가: 조직 코드
    orgText: user?.orgNm || '', // 추가: 조직 이름
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
  const [showEmpStatisticPopup, setShowEmpStatisticPopup] = useState(false);
  const [showOrgPopup, setShowOrgPopup] = useState(false); // 추가: 조직 선택 팝업 상태
  const [selectedData, setSelectedData] = useState(null);
  const [selectedEmpData, setSelectedEmpData] = useState(null);

  // 추가: pGUBUN 동적 설정
  const pGUBUN = (() => {
    if (showOrgPopup) {
      if (filters.classGubun === 'BIZ') {
        return 'STABIZEMPNO';
      } else if (filters.classGubun === 'DESIGN') {
        return 'STADESIGNEMPNO';
      } else if (filters.classGubun === 'LINE') {
        return 'STALINEEMPNO';
      }
      return 'OPEREMPNO';
    }
    return 'LIST'; // 기본값은 'LIST'로 유지
  })();

  // 공통 cellClick 핸들러
  const handleDayClick = (cell, day) => {
    const cellValue = cell.getValue();
    if (!cellValue || parseFloat(cellValue) === 0) return;
    const rowData = cell.getRow().getData();
    const sectionCd = rowData.SECTIONCD;
    const orgCd = rowData.ORGCD;
    setSelectedData({
      SECTIONCD: sectionCd,
      ORGCD: orgCd,
      DDATE: `${rowData.MDATE}${day.padStart(2, '0')}`,
    });
    setShowStatisticPopup(true);
  };

  const handleEmpClick = (e, cell) => {
    const value = cell.getValue();
    const rowData = cell.getRow().getData();
    const sectionCd = rowData.SECTIONCD;
    const orgCd = rowData.ORGCD;
    const mDate = rowData.MDATE;
    setSelectedEmpData({
      SECTIONCD: sectionCd,
      ORGCD: orgCd,
      MDATE: mDate,
    });
    setShowEmpStatisticPopup(true);
  };

  // 추가: 조직 선택 확인 핸들러
  const handleOrgConfirm = (selectedRows) => {
    if (!selectedRows || selectedRows.length === 0) return;
    const newOrgCd = selectedRows.map((row) => row.ORGCD).join(',');
    const newOrgNm = selectedRows.map((row) => row.ORGNM).join(',');
    setFilters((prev) => ({ ...prev, ORGCD: newOrgCd, orgText: newOrgNm }));
    setShowOrgPopup(false);
  };

  // 추가: 조직 선택 취소 핸들러
  const handleOrgCancel = () => {
    setShowOrgPopup(false);
  };

  // 초기 searchConfig 설정
  const searchConfig = {
    areas: [
      {
        type: 'search',
        fields: [
          { id: 'classGubunLbl', type: 'label', row: 1, label: '분야', labelVisible: false, enabled: true },
          ...(hasPermission(user?.auth, 'standardOper')
            ? [{ id: 'classGubun', type: 'select', row: 1, label: '분야', labelVisible: false, options: [{ value: 'LINE', label: '선로' }, { value: 'DESIGN', label: '설계' }, { value: 'BIZ', label: 'BIZ' }], defaultValue: 'LINE', enabled: true, eventType: 'selectChange' }]
            : user?.standardSectionCd === 'LINE'
              ? [{ id: 'classGubunTxt', type: 'text', row: 1, label: '분야', defaultValue: '선로', labelVisible: false, enabled: true, width:'60px' }]
              : user?.standardSectionCd === 'DESIGN'
                ? [{ id: 'classGubunTxt', type: 'text', row: 1, label: '분야', defaultValue: '설계', labelVisible: false, enabled: true, width:'60px' }]
                : user?.standardSectionCd === 'BIZ'
                  ? [{ id: 'classGubunTxt', type: 'text', row: 1, label: '분야', defaultValue: 'BIZ', labelVisible: false, enabled: true, width:'60px' }]
                  : []),
          { id: 'monthDate', type: 'month', row: 1, width: '74px', label: '월', labelVisible: true, placeholders: '월 선택', enabled: true, defaultValue: today.substring(0, 7) },
          { id: 'orgText', type: 'text', row: 1, label: '조직', labelVisible: true, placeholder: '조직 선택', enabled: false }, // 추가: 조직 텍스트
          { id: 'orgPopupBtn', type: 'popupIcon', row: 1, label: '조직 선택', labelVisible: false, eventType: 'showOrgPopup', enabled: true }, // 추가: 조직 선택 버튼
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
      monthDate: prev.monthDate || today.substring(0, 7),
      ORGCD: prev.ORGCD || user?.orgCd || '', // 추가: 조직 코드 초기화
      orgText: prev.orgText || user?.orgNm || '', // 추가: 조직 이름 초기화
    }));
    setTableFilters(initialFilters(filterTableFields));
  }, [today, user]);

  const columns = [
    { headerHozAlign: 'center', hozAlign: 'center', title: 'No', field: 'ID', sorter: 'number', width: 60, frozen: true },
    { headerHozAlign: 'center', hozAlign: 'center', title: '업무분야코드', field: 'SECTIONCD', sorter: 'string', width: 100, visible: false, frozen: true },
    { headerHozAlign: 'center', hozAlign: 'center', title: '업무분야', field: 'SECTIONNM', sorter: 'string', width: 100, frozen: true },
    { headerHozAlign: 'center', hozAlign: 'center', title: '월', field: 'MDATE', sorter: 'number', width: 100, frozen: true },
    { headerHozAlign: 'center', hozAlign: 'center', title: '팀코드', field: 'ORGCD', sorter: 'string', width: 100, frozen: true, visible: false },
    { headerHozAlign: 'center', hozAlign: 'center', title: '팀정보', field: 'ORGNM', sorter: 'string', width: 120, frozen: true },
    {
      headerHozAlign: 'center', hozAlign: 'center', title: '대상인원(명)', field: 'EMPTARGETCNT', sorter: 'number', width: 102, frozen: true,
      cellClick: (e, cell) => handleEmpClick(e, cell),
      formatter: (cell) => {
        const value = cell.getValue();
        if (!value || parseFloat(value) === 0) return '';
        return parseFloat(value).toFixed(2);
      },
      cellStyle: { color: '#247db3' },
    },
    {
      headerHozAlign: 'center', hozAlign: 'center', title: '입력인원(명)', field: 'EMPINPUTCNT', sorter: 'number', width: 102, frozen: true,
      cellClick: (e, cell) => handleEmpClick(e, cell),
      formatter: (cell) => {
        const value = cell.getValue();
        if (!value || parseFloat(value) === 0) return '';
        return parseFloat(value).toFixed(2);
      },
      cellStyle: { color: '#247db3' },
    },
    { headerHozAlign: 'center', hozAlign: 'center', title: '월누계', field: 'MONTH_TOTAL', sorter: 'number', width: 100, frozen: true },
    ...Array.from({ length: 31 }, (_, i) => {
      const day = String(i + 1).padStart(2, '0');
      return {
        headerHozAlign: 'center',
        hozAlign: 'center',
        title: `${day}일`,
        field: `DAY_${day}`,
        sorter: 'number',
        width: 80,
        cellClick: (e, cell) => handleDayClick(cell, day),
        formatter: (cell) => {
          const value = cell.getValue();
          if (!value || parseFloat(value) === 0) return '';
          return parseFloat(value).toFixed(2);
        },
        cellStyle: { color: '#247db3' },
      };
    }),
  ];

  const loadData = async () => {
    setLoading(true);
    setIsSearched(true);

    // 날짜 범위 체크
    if (filters.dayGubun === 'D') {
      const maxMonths = 3;
      const monthRange = common.checkMonthRange(filters.rangeStartDate, filters.rangeEndDate, maxMonths);
      if (maxMonths <= monthRange) {
        msgPopup(`${maxMonths}개월까지만 가능합니다.`);
        setLoading(false);
        return;
      }
    }

    try {
      const params = {
        pGUBUN: 'LIST',
        pSECTIONCD: hasPermission(user?.auth, 'standardOper')
          ? filters.classGubun
          : user?.standardSectionCd === 'LINE'
            ? 'LINE'
            : user?.standardSectionCd === 'DESIGN'
              ? 'DESIGN'
              : user?.standardSectionCd === 'BIZ'
                ? 'BIZ'
                : 'LINE',
        pEMPNO: user?.empNo || '',
        pORGCD: filters.ORGCD || '', // 수정: 선택된 조직 코드 사용
        pDATE1: filters.monthDate,
        pCLASSCD: '',
        pDEBUG: 'F',
      };

      const response = await fetchData('standard/teamInputStatistic/list', params);
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
        setRowCount(0);
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
          { field: 'ORGNM', type: 'like', value: filterText },
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
    } else if (eventType === 'showOrgPopup') { // 추가: 조직 팝업 이벤트
      setShowOrgPopup(true);
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
        onDownloadExcel={() => handleDownloadExcel(tableInstance.current, tableStatus, '팀별입력현황.xlsx')}
        buttonStyles={styles}
      />
      <div className={styles.tableWrapper}>
        {tableStatus === 'initializing' && <div>초기화 중...</div>}
        {loading && <div>로딩 중...</div>}
        <div ref={tableRef} className={styles.tableSection} style={{ visibility: loading || tableStatus !== 'ready' ? 'hidden' : 'visible' }} />
      </div>
      <StandardTeamOrgDayStatisticPopup
        show={showStatisticPopup}
        onHide={() => setShowStatisticPopup(false)}
        data={selectedData ? [selectedData] : []}
      />
      <StandardTeamInputEmpStatisticPopup
        show={showEmpStatisticPopup}
        onHide={() => setShowEmpStatisticPopup(false)}
        data={selectedEmpData ? [selectedEmpData] : []}
      />
      {showOrgPopup && ( // 추가: 조직 선택 팝업
        <OrgSearchPopup
          onClose={handleOrgCancel}
          onConfirm={handleOrgConfirm}
          initialSelectedOrgs={filters.ORGCD ? filters.ORGCD.split(',').filter(Boolean) : []}
          pGUBUN={pGUBUN}
          isMulti={false}
          isChecked={false}
        />
      )}
    </div>
  );
};

export default StandardTeamInputStatistic;
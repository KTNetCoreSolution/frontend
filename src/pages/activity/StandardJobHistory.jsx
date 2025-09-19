import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import OrgSearchPopup from '../../components/popup/OrgSearchPopup';
import common from '../../utils/common';

const fn_CellNumber = { editor: 'number', editorParams: { min: 0 }, editable: true };


// getFieldOptions 함수
const getFieldOptions = (fieldId) => {
  if (fieldId === 'filterSelect') {
    return [
      { value: '', label: '선택' },
      { value: 'EMPNM', label: '작업자' },
      { value: 'CLASSANM', label: '대분류' },
      { value: 'CLASSBNM', label: '중분류' },
      { value: 'CLASSCNM', label: '소분류' },
      { value: 'WORKNM', label: '근무유형' },
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

const StandardJobHistory = () => {
  const { user } = useStore();
  const navigate = useNavigate();
  const today = common.getTodayDate();
  const [filters, setFilters] = useState({
    classGubun: user?.standardSectionCd || 'LINE',
    classGubunTxt: user?.standardSectionCd === 'LINE' ? '선로' : user?.standardSectionCd === 'DESIGN' ? '설계' : user?.standardSectionCd === 'BIZ' ? 'BIZ' : '선로',
    ORGCD: user?.orgCd || '',
    dayGubun: 'M',
    monthDate: today.substring(0, 7),
    rangeStartDate: today,
    rangeEndDate: today,
    CLASSCD: '',
    orgText: user?.orgNm || '',
  });
  const [tableFilters, setTableFilters] = useState({});
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [isSearched, setIsSearched] = useState(false);
  const [tableStatus, setTableStatus] = useState('initializing');
  const [showOrgPopup, setShowOrgPopup] = useState(false);
  //const [selectedOrg, setSelectedOrg] = useState(user?.orgCd || '');
  const [rowCount, setRowCount] = useState(0);
  const tableRef = useRef(null);
  const tableInstance = useRef(null);
  const isInitialRender = useRef(true);

  // pGUBUN 동적 설정
  const pGUBUN = useMemo(() => {
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
    return 'OPEREMPNO';
  }, [showOrgPopup, filters.classGubun]);
  

  // 초기 searchConfig 설정
  const baseSearchConfig = {
    areas: [
      {
        type: 'search',
        fields: [
          { id: 'classGubunLbl', type: 'label', row: 1, label: '분야', labelVisible: false, enabled: true },
          ...(hasPermission(user?.auth, 'standardOper')
            ? [{ id: 'classGubun', type: 'select', row: 1, label: '분야', labelVisible: false, options: [{ value: 'LINE', label: '선로' }, { value: 'DESIGN', label: '설계' }, { value: 'BIZ', label: 'BIZ' }], defaultValue: 'LINE', enabled: true }]
            : user?.standardSectionCd === 'LINE'
              ? [{ id: 'classGubunTxt', type: 'text', row: 1, label: '분야', defaultValue: '선로', labelVisible: false, enabled: true, width:'60px' }]
              : user?.standardSectionCd === 'DESIGN'
                ? [{ id: 'classGubunTxt', type: 'text', row: 1, label: '분야', defaultValue: '설계', labelVisible: false, enabled: true, width:'60px' }]
                : user?.standardSectionCd === 'BIZ'
                  ? [{ id: 'classGubunTxt', type: 'text', row: 1, label: '분야', defaultValue: 'BIZ', labelVisible: false, enabled: true, width:'60px' }]
                  : []),
          { id: 'dayGubunLbl', type: 'label', row: 1, label: '작업', labelVisible: false, enabled: true },
          { id: 'dayGubun', type: 'select', row: 1, label: '', labelVisible: false, options: getFieldOptions('dayGubun'), defaultValue: 'M', enabled: true },
          { id: 'monthDate', type: 'month', row: 1, width: '74px', label: '', labelVisible: true, placeholder: '월 선택', enabled: false, defaultValue: today.substring(0, 7) },
          { id: 'rangeStartDate', type: 'startday', row: 1, width: '100px', label: '', labelVisible: true, placeholder: '시작일 선택', enabled: false, defaultValue: today },
          { id: 'rangeEndDate', type: 'endday', row: 1, width: '100px', label: ' ~ ', labelVisible: true, placeholder: '종료일 선택', enabled: false, defaultValue: today },
          { id: 'orgText', type: 'text', row: 1, label: '조직', labelVisible: true, placeholder: '조직 선택', enabled: false },
          { id: 'orgPopupBtn', type: 'popupIcon', row: 1, label: '조직 선택', labelVisible: false, eventType: 'showOrgPopup', enabled: true },
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
        const currentFields = prev.areas.find((a) => a.type === 'search').fields;
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
      const searchFields = searchConfig.areas.find((area) => area.type === 'search').fields;
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

  const columns = [
    { headerHozAlign: 'center', hozAlign: 'center', title: 'No', field: 'ID', sorter: 'number', width: 60, frozen: true },
    { headerHozAlign: 'center', hozAlign: 'center', title: '작업일자', field: 'DDATE', sorter: 'string', width: 100, frozen: true },
    { headerHozAlign: 'center', hozAlign: 'center', title: '업무분야코드', field: 'SECTIONCD', sorter: 'string', width: 100, visible: false, frozen: true },
    { headerHozAlign: 'center', hozAlign: 'center', title: '업무분야', field: 'SECTIONNM', sorter: 'string', width: 100, frozen: true },
    { headerHozAlign: 'center', hozAlign: 'center', title: '작업자', field: 'EMPNM', sorter: 'string', width: 100 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '조직1', field: 'ORGNM1', sorter: 'string', width: 130 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '조직2', field: 'ORGNM2', sorter: 'string', width: 130 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '조직3', field: 'ORGNM3', sorter: 'string', width: 130 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '조직4', field: 'ORGNM4', sorter: 'string', width: 130 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '대분류', field: 'CLASSANM', sorter: 'string', width: 180 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '중분류', field: 'CLASSBNM', sorter: 'string', width: 180 },
    { headerHozAlign: 'center', hozAlign: 'left', title: '소분류', field: 'CLASSCNM', sorter: 'string', width: 220 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '작업건수', field: 'WORKCNT', sorter: 'number', width: 130 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '시작시간', field: 'STARTTM', sorter: 'string', width: 100 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '종료시간', field: 'ENDTM', sorter: 'string', width: 100 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '업무량(시간)', field: 'WORKH', sorter: 'string', width: 110 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '근무형태코드', field: 'WORKCD', sorter: 'string', width: 100, visible: false },
    { headerHozAlign: 'center', hozAlign: 'center', title: '근무형태', field: 'WORKNM', sorter: 'string', width: 100 },
  ];

  const loadData = async () => {
    setLoading(true);
    setIsSearched(true);

    try {
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
        pORGCD: filters.ORGCD || 'ALL',
        pDATEGUBUN: filters.dayGubun,
        pDATE1: filters.dayGubun === 'D' ? filters.rangeStartDate : filters.dayGubun === 'M' ? filters.monthDate : '',
        pDATE2: filters.dayGubun === 'D' ? filters.rangeEndDate : filters.dayGubun === 'M' ? filters.monthDate : '',
        pCLASSCD: filters.CLASSCD,
        pDEBUG: 'F',
      };

      const response = await fetchData('standard/jobHistory/list', params);
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
          { field: 'CLASSANM', type: 'like', value: filterText },
          { field: 'CLASSBNM', type: 'like', value: filterText },
          { field: 'CLASSCNM', type: 'like', value: filterText },
          { field: 'WORKNM', type: 'like', value: filterText },
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
    } else if (eventType === 'showOrgPopup') {
      setShowOrgPopup(true);
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

  const handleOrgConfirm = (selectedRows) => {
    if (!selectedRows || selectedRows.length === 0) return;
    const newOrgCd = selectedRows.map((row) => row.ORGCD).join(',');
    const newOrgNm = selectedRows.map((row) => row.ORGNM).join(',');
    setFilters((prev) => ({ ...prev, ORGCD: newOrgCd, orgText: newOrgNm }));
    setShowOrgPopup(false);
  };

  const handleOrgCancel = () => {
    setShowOrgPopup(false);
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
        onDownloadExcel={() => handleDownloadExcel(tableInstance.current, tableStatus, '업무내역조회.xlsx')}
        buttonStyles={styles}
      />
      <div className={styles.tableWrapper}>
        {tableStatus === 'initializing' && <div>초기화 중...</div>}
        {loading && <div>로딩 중...</div>}
        <div ref={tableRef} className={styles.tableSection} style={{ visibility: loading || tableStatus !== 'ready' ? 'hidden' : 'visible' }} />
      </div>
      {showOrgPopup && (
        <OrgSearchPopup
          onClose={handleOrgCancel}
          onConfirm={handleOrgConfirm}
          initialSelectedOrgs={filters.ORGCD ? filters.ORGCD.split(',').filter(Boolean) : []}
          pGUBUN={pGUBUN}
          isMulti={true}
          isChecked={false}
        />
      )}
    </div>
  );
};

export default StandardJobHistory;
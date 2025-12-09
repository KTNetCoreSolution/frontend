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
import OrgSearchPopup from '../../components/popup/OrgSearchPopup';
import common from '../../utils/common';

const getFieldOptions = (fieldId, dependentValue = '', classData) => {
  if (fieldId === 'filterSelect') {
    return [
      { value: '', label: '선택' },
      { value: 'EMPNM', label: '담당자' },
      { value: 'REG_EMPNM', label: '등록자' },
      { value: 'CONTRACT_NUM', label: '계약번호' },
      { value: 'CLASSNM', label: '분류' },
      { value: 'PRODUCTNM', label: '상품명' },
      { value: 'SN', label: '시리얼번호' },
    ];
  }
  if (fieldId === 'dayGubun') {
    return [
      { value: 'M', label: '월' },
      { value: 'D', label: '일' },
    ];
  }
  if (fieldId === 'CLASSCD') {
    if (!Array.isArray(classData)) return [{ value: 'all', label: '==분류==' }];
    const uniqueMap = new Map();
    classData.forEach((item) => {
      if (item.DDLCD && item.DDLNM && !uniqueMap.has(item.DDLCD)) {
        uniqueMap.set(item.DDLCD, { value: item.DDLCD, label: item.DDLNM });
      }
    });
    return [{ value: 'all', label: '==분류==' }, ...Array.from(uniqueMap.values())];
  }
  return [];
};

const filterTableFields = [
  { id: 'filterSelect', type: 'select', label: '', options: getFieldOptions('filterSelect', '', []), width: '150px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true },
  { id: 'filterText', type: 'text', label: '', placeholder: '찾을 내용을 입력하세요', width: '200px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true },
];

const RentalJobHistory = () => {
  const { user } = useStore();
  const navigate = useNavigate();
  const today = common.getTodayDate();
  const [filters, setFilters] = useState({
    ORGCD: user?.orgCd || '',
    dayGubun: 'M',
    monthDate: today.substring(0, 7),
    rangeStartDate: today,
    rangeEndDate: today,
    CLASSCD: 'all',
    orgText: user?.orgNm || '',
  });
  const [tableFilters, setTableFilters] = useState({});
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [isSearched, setIsSearched] = useState(false);
  const [tableStatus, setTableStatus] = useState('initializing');
  const [showOrgPopup, setShowOrgPopup] = useState(false);
  const [rowCount, setRowCount] = useState(0);
  const tableRef = useRef(null);
  const tableInstance = useRef(null);
  const isInitialRender = useRef(true);
  const [classData, setClassData] = useState([]);
    
  const updatedClassOptions = React.useMemo(
    () => getFieldOptions('CLASSCD', '', classData),
    [classData]
  );

  const fetchBizMCodeOptions = async () => {
    try {
      const params = {
        pGUBUN: 'CLASS',
        pDEBUG: 'F',
      };
      const response = await fetchData('rental/ddlList', params);
      if (!response.success) {
        errorMsgPopup(response.message || '분류 옵션을 가져오는 중 오류가 발생했습니다.');
        return;
      }
      const fetchedOptions = Array.isArray(response.data) ? response.data : [];
      setClassData(fetchedOptions);
    } catch (err) {
      console.error('분류 옵션 로드 실패:', err);
      errorMsgPopup(err.response?.data?.message || '분류 옵션을 가져오는 중 오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    fetchBizMCodeOptions();
  }, []);

  const baseSearchConfig = {
    areas: [
      {
        type: 'search',
        fields: [
          { id: 'classGubunLbl', type: 'label', row: 1, label: '분야', labelVisible: false, enabled: true },
          { id: 'classGubun', type: 'select', row: 1, label: '분야', labelVisible: false, options: [{ value: '', label: '==분야==' },{ value: 'LINE', label: '선로' }, { value: 'DESIGN', label: '설계' }, { value: 'BIZ', label: 'BIZ' }], defaultValue: '', enabled: true },
          { id: 'CLASSCD', type: 'select', row: 1, label: '분류', labelVisible: true, options: updatedClassOptions, defaultValue: 'all', enabled: true },
          { id: 'dayGubunLbl', type: 'label', row: 1, label: '등록', labelVisible: false, enabled: true },
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
        const newFields = baseFields
          .filter((field) => {
            if (filters.dayGubun === 'M') {
              return field.id !== 'rangeStartDate' && field.id !== 'rangeEndDate';
            } else if (filters.dayGubun === 'D') {
              return field.id !== 'monthDate';
            }
            return true;
          })
          .map((field) => {
            if (field.id === 'CLASSCD') {
              return { ...field, options: updatedClassOptions };
            }
            return field;
          });
        return { ...area, fields: newFields };
      });
      return { ...prev, areas: newAreas };
    });
  }, [filters.dayGubun, updatedClassOptions]);

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
        CLASSCD: prev.CLASSCD || 'all',
      };
    });
    setTableFilters(initialFilters(filterTableFields));
  }, [searchConfig]);

  const columns = [
    { headerHozAlign: 'center', hozAlign: 'center', title: '순번', field: 'ID', sorter: 'string', width: 80, frozen: true },
    { headerHozAlign: 'center', hozAlign: 'center', title: '등록일', field: 'DDATE', sorter: 'string', width: 100, frozen: true },
    { headerHozAlign: 'center', hozAlign: 'center', title: '업무분야', field: 'SECTIONNM', sorter: 'string', width: 80, frozen: true },
    { headerHozAlign: 'center', hozAlign: 'center', title: '담당자사번', field: 'EMPNO', sorter: 'string', width: 100, visible:false },
    { headerHozAlign: 'center', hozAlign: 'center', title: '담당자', field: 'EMPNM', sorter: 'string', width: 100 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '조직1', field: 'ORGNM1', sorter: 'string', width: 130 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '조직2', field: 'ORGNM2', sorter: 'string', width: 130 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '조직3', field: 'ORGNM3', sorter: 'string', width: 130 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '조직4', field: 'ORGNM4', sorter: 'string', width: 130 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '계약번호', field: 'CONTRACT_NUM', sorter: 'string', width: 120 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '계약시작일', field: 'CONTRACT_STARTDT', sorter: 'string', width: 100 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '계약종료일', field: 'CONTRACT_ENDDT', sorter: 'string', width: 100 },
    { headerHozAlign: 'center', hozAlign: 'right', title: '임차가(월)', field: 'MRENT_PRICE', sorter: 'string', width: 120 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '자산번호', field: 'ASSET_NUM', sorter: 'string', width: 120 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '용도', field: 'PURPOSE', sorter: 'string', width: 120 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '지급구분', field: 'PAYGB', sorter: 'string', width: 120 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '분류', field: 'CLASSNM', sorter: 'string', width: 100 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '상품명', field: 'PRODUCTNM', sorter: 'string', width: 150 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '모델명', field: 'MODELNM', sorter: 'string', width: 400 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '시리얼번호', field: 'SN', sorter: 'string', width: 150 },
    { headerHozAlign: 'center', hozAlign: 'left', title: '주소지', field: 'ADDR', sorter: 'string', width: 350 },
    { headerHozAlign: 'center', hozAlign: 'left', title: '비고', field: 'MEMO', sorter: 'string', width: 300 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '등록자사번', field: 'REG_EMPNO', sorter: 'string', width: 100, visible:false },
    { headerHozAlign: 'center', hozAlign: 'center', title: '등록자', field: 'REG_EMPNM', sorter: 'string', width: 100 },
  ];

  const loadData = async () => {
    setLoading(true);
    setIsSearched(true);

    try {
      const params = {
        pGUBUN: 'LIST',
        pSECTIONCD: filters.classGubun || '',
        pEMPNO: user?.empNo || '',
        pORGCD: filters.ORGCD || 'ALL',
        pCLASSCD: filters.CLASSCD === 'all' ? '' : filters.CLASSCD,
        pDATEGUBUN: filters.dayGubun,
        pDATE1: filters.dayGubun === 'D' ? filters.rangeStartDate : filters.dayGubun === 'M' ? filters.monthDate : '',
        pDATE2: filters.dayGubun === 'D' ? filters.rangeEndDate : filters.dayGubun === 'M' ? filters.monthDate : '',
        pDEBUG: 'F',
      };

      const response = await fetchData('rental/jobHistory/list', params);
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
      await new Promise((resolve) => setTimeout(resolve, 1000));
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
          { field: 'REG_EMPNM', type: 'like', value: filterText },
          { field: 'CONTRACT_NUM', type: 'like', value: filterText },
          { field: 'CLASSNM', type: 'like', value: filterText },
          { field: 'PRODUCTNM', type: 'like', value: filterText },
          { field: 'SN', type: 'like', value: filterText },
        ], 'or');
      } else {
        tableInstance.current.clearFilter();
      }
    } else if (filterSelect) {
      tableInstance.current.clearFilter();
    }
    setRowCount(tableInstance.current.getDataCount());
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
          pGUBUN="RENTALEMPNO"
          isMulti={true}
          isChecked={false}
        />
      )}
    </div>
  );
};

export default RentalJobHistory;
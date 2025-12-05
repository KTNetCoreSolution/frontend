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
import CommonPopup from '../../components/popup/CommonPopup';
import StandardEmpStatisticPopup from './popup/StandardEmpStatisticPopup';

const fn_CellNumber = { editor: 'number', editorParams: { min: 0 }, editable: true };

// 삭제 버튼 생성 함수
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
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [showStatisticPopup, setShowStatisticPopup] = useState(false);
  const [selectedEmpData, setSelectedEmpData] = useState(null);

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

  // 모든 컬럼 정의 (BIZ 및 LINE, DESIGN 포함)
  const columns = [
    { headerHozAlign: 'center', hozAlign: 'center', title: 'No', field: 'ID', sorter: 'number', width: 60, frozen: true },
    { headerHozAlign: 'center', hozAlign: 'center', title: '기준일자', field: 'DDATE', sorter: 'string', width: 100, frozen: true },
    { headerHozAlign: 'center', hozAlign: 'center', title: '업무분야코드', field: 'SECTIONCD', sorter: 'string', width: 100, visible: false, frozen: true },
    { headerHozAlign: 'center', hozAlign: 'center', title: '업무분야', field: 'SECTIONNM', sorter: 'string', width: 100, frozen: true },
    { 
      headerHozAlign: 'center', hozAlign: 'center', title: '팀원', field: 'EMPNM', sorter: 'string', width: 100, frozen: true,
      cellClick: (e, cell) => {
        const rowData = cell.getRow().getData();
        setSelectedEmpData({
          SECTIONCD: rowData.SECTIONCD,
          DDATE: rowData.DDATE,
          CLASSCD: rowData.CLASSCCD,
          EMPNO: rowData.EMPNO || '',
        });
        setShowStatisticPopup(true);
      },
      cellStyle: { color: '#247db3' }
    },
    { headerHozAlign: 'center', title: '대분류코드', field: 'CLASSACD', hozAlign: 'center', width: 100, visible: false },
    { headerHozAlign: 'center', hozAlign: 'center', title: '대분류', field: 'CLASSANM', sorter: 'string', width: 180 },
    { headerHozAlign: 'center', title: '중분류코드', field: 'CLASSBCD', hozAlign: 'center', width: 100, visible: false },
    { headerHozAlign: 'center', hozAlign: 'center', title: '중분류', field: 'CLASSBNM', sorter: 'string', width: 180 },
    { headerHozAlign: 'center', title: '소분류코드', field: 'CLASSCCD', hozAlign: 'center', width: 100, visible: false },
    { headerHozAlign: 'center', hozAlign: 'left', title: '소분류', field: 'CLASSCNM', sorter: 'string', width: 220 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '건(구간/본/개소)', field: 'WORKCNT', sorter: 'number', width: 130 }, //LINE,DESIGN
    { headerHozAlign: 'center', hozAlign: 'center', title: '근무형태코드', field: 'WORKCD', sorter: 'string', width: 100, visible: false }, //LINE,DESIGN
    { headerHozAlign: 'center', hozAlign: 'center', title: '근무형태', field: 'WORKNM', sorter: 'string', width: 100 }, //LINE,DESIGN
    { headerHozAlign: 'center', hozAlign: 'center', title: '작업시간', field: 'WORKDT', sorter: 'string', width: 100 }, //LINE,DESIGN
    { headerHozAlign: 'center', hozAlign: 'center', title: '업무량(시간)', field: 'WORKH', sorter: 'number', width: 120 }, //LINE,DESIGN
    { headerHozAlign: 'center', hozAlign: 'center', title: '업무분야코드', field: 'SECTIONCD', sorter: 'string', width: 100, visible: false },
    { headerHozAlign: 'center', hozAlign: 'center', title: '시작시간', field: 'STARTTM', sorter: 'string', width: 100, visible: false },
    { headerHozAlign: 'center', hozAlign: 'center', title: 'BIZ입력키', field: 'BIZINPUTKEY', sorter: 'string', width: 100, visible: false },
    { headerHozAlign: 'center', hozAlign: 'center', title: '사원번호', field: 'EMPNO', sorter: 'string', width: 100, visible: false },
    { headerHozAlign: 'center', hozAlign: 'center', title: '회선번호+고객명', field: 'BIZTXT', sorter: 'string', width: 128 }, //BIZ
    { headerHozAlign: 'center', hozAlign: 'center', title: '출동여부', field: 'BIZRUNNM', sorter: 'string', width: 100 }, //BIZ
    { headerHozAlign: 'center', hozAlign: 'center', title: '작업인원', field: 'BIZMANNM', sorter: 'string', width: 100 }, //BIZ
    { headerHozAlign: 'center', hozAlign: 'center', title: '근무시간', field: 'BIZWORKNM', sorter: 'string', width: 100 }, //BIZ
    { headerHozAlign: 'center', hozAlign: 'center', title: '회선수', field: 'BIZWORKCNT', sorter: 'string', width: 100 }, //BIZ
    { headerHozAlign: 'center', hozAlign: 'center', title: '프로세스', field: 'BIZWORKGBNM', sorter: 'string', width: 180 }, //BIZ
    { headerHozAlign: 'center', hozAlign: 'center', title: '처리시간(시간)', field: 'BIZWORKH', sorter: 'number', width: 120 }, //BIZ
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
            setSelectedRow(rowData);
            setShowDeletePopup(true);
          }).formatter(cell);
        }
        return null;
      }
    },
  ];

  // filters 초기화
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      rangeStartDate: prev.rangeStartDate || today,
    }));
    setTableFilters(initialFilters(filterTableFields));
  }, [today]);

  // 테이블 초기화
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

  // classGubun 변경 시 컬럼 가시성 제어
  useEffect(() => {
    if (tableInstance.current && tableStatus === 'ready') {
      const isBiz = hasPermission(user?.auth, 'standardOper') ? filters.classGubun === 'BIZ' : user?.standardSectionCd === 'BIZ';

      // LINE, DESIGN 컬럼
      if(isBiz)
      {
        tableInstance.current.hideColumn('WORKCNT');
        tableInstance.current.hideColumn('WORKNM');
        tableInstance.current.hideColumn('WORKDT');
        tableInstance.current.hideColumn('WORKH');

        tableInstance.current.showColumn('BIZTXT');
        tableInstance.current.showColumn('BIZRUNNM');
        tableInstance.current.showColumn('BIZMANNM');
        tableInstance.current.showColumn('BIZWORKNM');
        tableInstance.current.showColumn('BIZWORKCNT');
        tableInstance.current.showColumn('BIZWORKGBNM');
        tableInstance.current.showColumn('BIZWORKH');
      }
      else{
        tableInstance.current.showColumn('WORKCNT');
        tableInstance.current.showColumn('WORKNM');
        tableInstance.current.showColumn('WORKDT');
        tableInstance.current.showColumn('WORKH');
        
        tableInstance.current.hideColumn('BIZTXT');
        tableInstance.current.hideColumn('BIZRUNNM');
        tableInstance.current.hideColumn('BIZMANNM');
        tableInstance.current.hideColumn('BIZWORKNM');
        tableInstance.current.hideColumn('BIZWORKCNT');
        tableInstance.current.hideColumn('BIZWORKGBNM');
        tableInstance.current.hideColumn('BIZWORKH');

      }
    }
  }, [filters.classGubun, tableStatus]);

  const loadData = async () => {
    setLoading(true);
    setIsSearched(true);
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
        pORGCD: '',
        pDATE1: filters.rangeStartDate,
        pCLASSCD: '',
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
    if (user === null) return;
    if (!user) navigate('/');
  }, [user, navigate]);

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
    } else if (eventType === 'selectChange') {
      setFilters((prev) => ({ ...prev, [payload.id]: payload.value }));
    }
  };

  // 삭제 확인 핸들러
  const handleDeleteConfirm = async () => {
    if (!selectedRow) return;
    setShowDeletePopup(false);
    setLoading(true);
    try {
      let apiPath, params;
      if (selectedRow.SECTIONCD === 'LINE' || selectedRow.SECTIONCD === 'DESIGN') {
        apiPath = 'standard/empJob/common/reg/save';
        params = {
          pGUBUN: 'D',
          pDATE1: selectedRow.DDATE,
          pDATE2: '',
          pORGIN_STARTTM: selectedRow.STARTTM,
          pSTARTTM: selectedRow.STARTTM,
          pENDTM: '',
          pCLASSCD: '',
          pWORKCD: '',
          pWORKCNT: '',
          pSECTIONCD: selectedRow.SECTIONCD,
          pEMPNO: user?.empNo || '',
          pATTRIBUTE1: '',
        };
      } else if (selectedRow.SECTIONCD === 'BIZ') {
        apiPath = 'standard/empJob/biz/reg/save';
        params = {
          pGUBUN: 'DD',
          pDATE1: selectedRow.DDATE,
          pDATE2: '',
          pCLASSCD: '',
          pBIZTXT: '',
          pBIZRUN: '',
          pBIZMAN: '',
          pWORKCD: '',
          pWORKCNT: '',
          pWORKGBCD: selectedRow.BIZWORKGB || '',
          pWORKGBTM: '',
          pSECTIONCD: selectedRow.SECTIONCD,
          pBIZINPUTKEY: selectedRow.BIZINPUTKEY,
          pEMPNO: user?.empNo || '',
        };
      } else {
        errorMsgPopup('지원되지 않는 SECTIONCD입니다.');
        return;
      }

      const response = await fetchData(apiPath, params);
      if (!response.success) {
        errorMsgPopup(response.message || '삭제 중 오류가 발생했습니다.');
        return;
      } else {
        if (response.errMsg !== '' || (response.data[0] && response.data[0].errCd !== '00')) {
          let errMsg = response.errMsg;
          if (response.data[0] && response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;
          msgPopup(errMsg);
          return;
        }
      }
      msgPopup('삭제되었습니다.');
      loadData();
    } catch (err) {
      console.error('삭제 실패:', err);
      errorMsgPopup('삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setSelectedRow(null);
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
      <CommonPopup
        show={showDeletePopup}
        onHide={() => { setShowDeletePopup(false); setSelectedRow(null); }}
        onConfirm={handleDeleteConfirm}
        title="삭제 확인"
      >
        <p className='commonInnerTxt'>{selectedRow?.CLASSCNM ? `${selectedRow.CLASSCNM} 삭제하시겠습니까?` : '삭제하시겠습니까?'}</p>
      </CommonPopup>
      <StandardEmpStatisticPopup
        show={showStatisticPopup}
        onHide={() => setShowStatisticPopup(false)}
        onSelect={(selected) => {
          setShowStatisticPopup(false);
        }}
        data={selectedEmpData ? [selectedEmpData] : []}
      />
    </div>
  );
};

export default StandardTeamJobManage;
import React, { useState, useEffect, useRef } from 'react';
//import { fetchJsonData } from '../../utils/dataUtils';
//import sampleData from '../../data/data.json';
import { createTable } from '../../utils/tableConfig.js';
import { initialFilters } from '../../utils/tableEvent.js';
import { handleDownloadExcel } from '../../utils/tableExcel.js';
import useStore from '../../store/store.js';
import MainSearch from '../../components/main/MainSearch.jsx';
import TableSearch from '../../components/table/TableSearch.jsx';
import CommonPopup from '../../components/popup/CommonPopup.jsx';
import OrgSearchPopup from '../../components/popup/OrgSearchPopup.jsx';
import styles from '../../components/table/TableSearch.module.css';
import { fetchData } from '../../utils/dataUtils.js';
import { errorMsgPopup } from '../../utils/errorMsgPopup.js';
import { msgPopup } from '../../utils/msgPopup.js';
import { arEG, tr } from 'date-fns/locale';

/**
 * 필드 옵션 데이터를 반환
 * @param {string} fieldId - 필드 식별자
 * @param {string} dependentValue - 의존 값
 * @returns {Array} 옵션 배열
 */
const getFieldOptions = (fieldId, dependentValue = '') => {
  const optionsMap = {
    filterSelect: [
      { value: '', label: '선택' },
      { value: 'CARTYPE', label: '차종' }
    ],
    filterCarType: [
      { value: '', label: '선택' },
      { value: '승용차', label: '승용차' },
      { value: '승합차', label: '승합차' },
      { value: '특수차', label: '특수차' },
      { value: '화물차', label: '화물차' },
    ],
  };
  return optionsMap[fieldId] || [];
};

/**
 * 테이블 및 검색 기능 컴포넌트
 * @returns {JSX.Element} 검색 폼과 테이블을 포함한 컴포넌트
 */
const WorkPerformanceInfo = () => {
  const { user } = useStore();
  const [showPopup, setShowPopup] = useState(false);
  const [popupTitle, setPopupTitle] = useState('');
  const [popupContent, setPopupContent] = useState(null);
  const [popupOnConfirm, setPopupOnConfirm] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(user?.orgCd || ''); // 조직 선택 팝업용 상태
  const [selectedOrgNm, setSelectedOrgNm] = useState(user?.orgNm || ''); // 조직 선택 팝업용 상태
  const [_selectedUsers] = useState([]);
  const selectedOrgRef = useRef(selectedOrg); // 최신 selectedOrg 값을 추적

  // selectedOrg 변경 시 ref 업데이트
  useEffect(() => {
    selectedOrgRef.current = selectedOrg;
    setFilters((prev) => ({ ...prev, orgText: selectedOrgNm }));
  }, [selectedOrg]);

  // 검색 및 버튼 구성
  // TODO: searchConfig는 MainSearch 컴포넌트에서 동적으로 검색 폼과 버튼을 렌더링하기 위한 설정 객체입니다. 아래는 각 속성의 사용법과 동작에 대한 설명입니다:
  // - id: 필드의 고유 식별자로, 필터 객체(filters)에서 해당 필드의 값을 참조하는 키로 사용됩니다. 예: 'name'은 filters.name으로 값을 저장합니다. 필수 속성이며, 중복되지 않아야 합니다.
  // - type: 렌더링할 입력 요소의 유형을 지정합니다. MainSearch에서 다음 유형을 지원합니다:
  //   - 'text': 텍스트 입력 필드(<input type="text">). 입력값은 maxLength로 제한됩니다.
  //   - 'textarea': 텍스트 영역(<textarea>). maxLength로 입력 제한.
  //   - 'select': 드롭다운 메뉴(<select>). options 속성으로 선택 항목 지정.
  //   - 'day', 'startday', 'endday': 단일 날짜 선택 필드(DatePickerCommon 사용). 'startday'와 'endday'는 각각 기간의 시작/종료 날짜로, 상호 제약 조건 적용.
  //   - 'startmonth', 'endmonth': 월 선택 필드. 'startmonth'와 'endmonth'는 기간의 시작/종료 월로, 상호 제약 조건 적용.
  //   - 'dayperiod', 'monthperiod': 날짜 또는 월 범위 선택 필드. { start, end } 객체로 값을 저장.
  //   - 'checkbox': 체크박스(<input type="checkbox">). true/false 값 저장.
  //   - 'radio': 라디오 버튼 그룹. options 속성으로 선택 항목 지정.
  //   - 'popupIcon': 팝업을 여는 버튼(예: '+'). eventType 속성으로 클릭 시 동작 정의.
  //   - 'button': 일반 버튼. eventType 속성으로 클릭 시 동작 정의.
  // - row: 필드 또는 버튼이 표시될 행 번호(정수, 기본값 1). 같은 row 값을 가진 요소는 같은 행에 배치됩니다.
  // - label: 입력 요소 또는 버튼 옆에 표시되는 라벨 텍스트. 예: '이름'은 필드 옆에 "이름:"으로 표시됩니다.
  // - labelVisible: 라벨 표시 여부(boolean). true(기본값)면 라벨 표시, false면 숨김.
  // - placeholder: 입력 필드('text', 'textarea', 'day', 'startday', 'endday', 'startmonth', 'endmonth', 'dayperiod', 'monthperiod')에 표시되는 플레이스홀더 텍스트. 미설정 시 빈 문자열 또는 label 값 사용.
  // - maxLength: 'text' 또는 'textarea'의 최대 입력 문자 수(기본값 255). 입력 초과 시 common.validateVarcharLength를 통해 에러 팝업 표시.
  // - options: 'select' 또는 'radio' 타입에서 선택 항목 배열. 예: [{ value: 'active', label: '활성' }]. getFieldOptions 함수로 동적으로 제공.
  // - eventType: 'popupIcon' 또는 'button' 타입에서 클릭 시 발생하는 이벤트 이름. 예: 'showOrgPopup'은 조직 선택 팝업을 엽니다.
  // - width: 요소의 너비(예: '200px'). 'default' 또는 미설정 시 defaultStyles.width('150px') 적용. 버튼은 기본값 '80px'.
  // - height: 요소의 높이(예: '30px'). 'default' 또는 미설정 시 defaultStyles.height('30px') 적용.
  // - backgroundColor: 요소의 배경색(예: '#ffffff'). 'default' 또는 미설정 시 defaultStyles.backgroundColor('#ffffff') 적용. 버튼은 기본값 '#00c4b4'.
  // - color: 요소의 글자색(예: '#000000'). 'default' 또는 미설정 시 defaultStyles.color('#000000') 적용. 버튼은 기본값 '#ffffff'.
  // - enabled: 요소 활성화 여부(boolean). true(기본값)면 입력/클릭 가능, false면 비활성화(disabled).
  // - defaultValue: 초기값 설정. 'day', 'startday', 'endday'는 날짜 문자열(예: '2025-05-31'), 'startmonth', 'endmonth'는 월 문자열(예: '2025-05'), 'dayperiod', 'monthperiod'는 { start, end } 객체. 미설정 시 오늘 날짜/월 적용.
  const searchConfig = {
    areas: [
      {
        type: 'search',
        fields: [
          { id: 'orgText', type: 'text', row: 1, label: '조직', labelVisible: true, placeholder: '조직 선택', width: '150px', height: '30px', backgroundColor: '#f0f0f0', color: '#000000', enabled: false },
          { id: 'orgPopupBtn', type: 'popupIcon', row: 1, label: '조직 선택', labelVisible: false, eventType: 'showOrgPopup', width: '30px', height: '30px', backgroundColor: '#f0f0f0', color: '#000000', enabled: true },
          { id: 'carno', type: 'text', row: 1, label: '차량번호', labelVisible: true, maxLength: 50, width: '200px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true },
        ],
      },
      {
        type: 'buttons',
        fields: [
          { id: 'searchBtn', type: 'button', row: 1, label: '검색', eventType: 'search', width: '80px', height: '30px', backgroundColor: '#00c4b4', color: '#ffffff', enabled: true },
        ],
      },
    ],
  };

  const [filterTableFields, setFilterTableFields] = useState([
    { id: 'filterSelect', type: 'select', label: '', options: getFieldOptions('filterSelect'), width: 'default', height: 'default', backgroundColor: 'default', color: 'default', display: 'flex' },
    { id: 'filterValue', type: 'text', label: '', width: 'default', height: 'default', backgroundColor: 'default', color: 'default', disabled: 'disabled', display: 'flex' },
    { id: 'filterCarType', type: 'select', label: '', options: getFieldOptions('filterCarType'), width: '100px', height: 'default', backgroundColor: 'default', color: 'default', display: 'none' },
  ]);

  // const [filters, setFilters] = useState(initialFilters(searchConfig.areas.find((area) => area.type === 'search').fields));
  const [filters, setFilters] = useState({orgcd: selectedOrg, ...initialFilters(searchConfig.areas.find((area) => area.type === 'search').fields) });
  const [tableFilters, setTableFilters] = useState(initialFilters(filterTableFields));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [isSearched, setIsSearched] = useState(false);
  const [tableStatus, setTableStatus] = useState('initializing');
  const [error, setError] = useState(null);
  const [rowCount, setRowCount] = useState(0);
  const tableRef = useRef(null);
  const tableInstance = useRef(null);
  const isInitialRender = useRef(true);
  const latestFiltersRef = useRef(filters);
  const latestTableFiltersRef = useRef(filterTableFields);

  // 최신 필터를 ref에 유지하여 비동기 상태 문제를 방지
  useEffect(() => {
    latestFiltersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    latestTableFiltersRef.current = filterTableFields;
  }, [filterTableFields]);

  // 테이블 컬럼 정의
  const columns = [
    { title: '번호', field: 'ID', width: 60, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '차량번호', field: 'CARNO', width: 120, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '차종', field: 'CARTYPE', width: 80, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '차명', field: 'CARNM', width: 120, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '사용연료', field: 'USEFUEL', width: 90, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '조직', field: 'ORG_GROUP', width: 100, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '본부', field: 'ORGNMLV1', width: 120, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '설계부/운용센터', field: 'ORGNMLV2', width: 120, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '부', field: 'ORGNMLV3', width: 120, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '팀', field: 'ORGNMLV4', width: 120, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '운용율3M(%)', field: 'LOGRATE_3M', width: 120, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '운행일수', field: 'LOG_CNT', width: 90, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '유효일수', field: 'WORKDATE_CNT', width: 90, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '운용율(%)', field: 'LOGRATE', width: 120, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '운행거리', field: 'LEAVEKM', width: 90, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '운전자(정)사번', field: 'PRIMARY_MANAGER_EMPNO', width: 120, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '운전자(정)', field: 'PRIMARY_MANAGER_EMPNM', width: 100, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '렌터카업체', field: 'RENTALCOMP', width: 100, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '차량취득일(kt도입기준)', field: 'CARACQUIREDDT', width: 160, headerHozAlign: 'center', hozAlign: 'center' },
  ];
  
  // 데이터 로드 함수
  /**
   * JSON 데이터를 가져오고 클라이언트 측에서 필터링하여 테이블 데이터를 로드
   * @async
   */
  const loadData = async () => {
    setLoading(true);
    setIsSearched(true);
    setError(null);
    setTableFilters(initialFilters(filterTableFields));

    setFilterTableFields((prevFields) => {
      return prevFields.map((filter) => {
        if (filter.id === 'filterSelect') {  
          return { ...filter, display: 'flex' }; 
        } else if (filter.id === 'filterValue') {
          return { ...filter, display: 'flex', value: '' };
        } else {
          return { ...filter, display: 'none', value: '' }; // 기본적으로 숨김 처리
        }
      });
    });    

    // 상태 업데이트 대기
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 최신 필터 사용
    const currentFilters = latestFiltersRef.current;

    // API 로 통신할 경우 fetchData()
    try {
      const params = {pORGCD: selectedOrgRef.current, pCARNO: currentFilters.carno || '', pDEBUG: "F"};

      const response = await fetchData("carStat/workPerformance", params);
      if (!response.success) {
        errorMsgPopup(response.message || "데이터를 가져오는 중 오류가 발생했습니다.");
        setData([]);
        return;
      }
      if (response.errMsg !== "") {
        console.log(response.errMsg);
        setData([]);
        return;
      }
      const responseData = Array.isArray(response.data) ? response.data : [];
      setData(responseData);
    } catch (err) {
      errorMsgPopup(err.response?.data?.message || "데이터를 가져오는 중 오류가 발생했습니다.");
      setData([]);
    } finally {
      setLoading(false);
    }
  };
  

  // 동적 이벤트 처리
  /**
   * 검색, 초기화, 팝업 등 다양한 이벤트를 처리
   * @param {string} eventType - 이벤트 유형
   * @param {Object} eventData - 이벤트 데이터
   */
  const handleDynamicEvent = (eventType, eventData) => {
    if (eventType === 'search') {
      loadData();
    } else if (eventType === 'showOrgPopup') {
      setPopupTitle('조직 선택');
      setPopupContent(
        <div>
          <OrgSearchPopup
            onClose={() => setShowPopup(false)}
            onConfirm={(selectedRows) => {
              const orgNames = selectedRows.map(row => row.ORGNM).join(', ');
              setSelectedOrg(selectedRows.length > 0 ? selectedRows[0].ORGCD : '');
              setSelectedOrgNm(selectedRows.length > 0 ? orgNames : '');
            }}
            pGUBUN="CAREMPNO" //차량용 트리 시(_fix 테이블 사용)
            initialSelectedOrgs={selectedOrgRef.current} //초기 선택된 조직
            isChecked={true} //체크박스 사용 여부
          />
        </div>
      );
      setPopupOnConfirm(() => () => {
        setShowPopup(false);
        return true;
      });
      setShowPopup(true);
    } 
  };

  // Tabulator 테이블 초기화
  /**
   * Tabulator 테이블을 초기화하고, 컴포넌트 언마운트 시 정리
   * @async
   */
  useEffect(() => {
    const initializeTable = async () => {
      // 다른 컴포넌트 렌더링 대기
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (!tableRef.current) {
        console.warn("테이블 컨테이너가 준비되지 않았습니다.");
        return;
      }
      try {
        // Tabulator 테이블 생성
        //1.테블레이터 기본 속성으로 호출 시
        //tableInstance.current = createTable(tableRef.current, columns, [], {});
        //2.테블레이터 기본 옵션을 수정 시
        //tableConfig.js 의 defaultOptions 선언 값을 override 설정 변경
        tableInstance.current = createTable(tableRef.current, columns, [], {
          headerHozAlign: "center",
          headerFilter: true,
          layout: 'fitData'
        });

        if (!tableInstance.current) throw new Error("createTable returned undefined or null");
        setTableStatus("ready");

      } catch (err) {
        setTableStatus("error");
        console.error("테이블 초기화 실패:", err.message);
      }
    };

    initializeTable();

    // 컴포넌트 언마운트 시 테이블 정리
    return () => {
      if (tableInstance.current) {
        tableInstance.current.destroy();
        tableInstance.current = null;
        setTableStatus("initializing");
      }
    };
  }, []);

  // 데이터 업데이트
  /**
   * 테이블 데이터를 업데이트하고, 검색 결과가 없으면 알림 표시
   */
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    const table = tableInstance.current;

    if (!table || tableStatus !== "ready" || loading) return;
    if (table.rowManager?.renderer) {
      table.setData(data);
      if (isSearched && data.length === 0 && !loading) {
        tableInstance.current.alert("검색 결과 없음", "info");
      } else {
        tableInstance.current.clearAlert();
        const rows = tableInstance.current.getDataCount();
        setRowCount(rows);
      }
    } else {
      console.warn("renderer가 아직 초기화되지 않았습니다.");
    }
  }, [data, loading, tableStatus, isSearched]);

  // 테이블 필터 업데이트
  /**
   * 테이블 필터를 동적으로 업데이트
   */
  useEffect(() => {
    if (isInitialRender.current || tableFilters.current === null || tableStatus !== "ready" || loading) return;
    
    if(tableInstance.current !== null && tableInstance.current !== undefined) {
      tableInstance.current.clearFilter();
    }

    const fields = tableFilters.filterSelect;    

    setFilterTableFields((prevFields) => {
      return prevFields.map((filter) => {
        if (filter.id === 'filterSelect') {  
          return { ...filter, display: 'flex' }; 
        } else if (filter.id === 'filterCarType') { 
          return { ...filter, display: fields === 'CARTYPE' ? 'flex' : 'none', value: '' };
        } else {
          return { ...filter, display: fields === '' ? 'flex' : 'none', value: '' }; // 기본적으로 숨김 처리
        }
      });
    });

    let values = '';

    if (fields === 'CARTYPE') {
      values = tableFilters.filterCarType;
    } 
    
    if (fields !== '' && fields !== undefined) {
      if(tableInstance.current !== null && tableInstance.current !== undefined) {
        tableInstance.current.setFilter(fields, "like", values);
      }
    }

  }, [tableFilters.filterSelect]);
  
  useEffect(() => {
    if (isInitialRender.current || tableFilters.current === null || tableStatus !== "ready" || loading) return;

    if(tableInstance.current !== null && tableInstance.current !== undefined) {
      tableInstance.current.clearFilter();
    }

    const fields = tableFilters.filterSelect;
    let values = '';

    if (fields === 'CARTYPE') {
      values = tableFilters.filterCarType;
    }
    
    if (fields !== '' && fields !== undefined) {
      if(tableInstance.current !== null && tableInstance.current !== undefined) {
        tableInstance.current.setFilter(fields, "like", values);
      }
    }
  }, [tableFilters.filterCarType]);

  return (
    <div className={styles.container}>
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
        onDownloadExcel={() => {handleDownloadExcel(tableInstance.current, tableStatus, '운행실적관리.xlsx')}}
        rowCount={rowCount}
        onEvent={handleDynamicEvent}
      />
      <div className={styles.tableWrapper}>
        {tableStatus === 'initializing' && <div>초기화 중...</div>}
        {loading && <div>로딩 중...</div>}
        {error && <div>{error}</div>}
        <div
          ref={tableRef}
          className={styles.tableSection}
          style={{ visibility: loading || tableStatus !== 'ready' ? 'hidden' : 'visible' }}
        />
      </div>
      <CommonPopup show={showPopup} onHide={() => setShowPopup(false)} onConfirm={popupOnConfirm} title={popupTitle}>
        {popupContent}
      </CommonPopup>
    </div>
  );
};

export default WorkPerformanceInfo;
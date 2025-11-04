import React, { useState, useEffect, useRef } from 'react';
import { createTable } from '../../utils/tableConfig.js';
import { initialFilters } from '../../utils/tableEvent.js';
import { handleDownloadExcel } from '../../utils/tableExcel.js';
import useStore from '../../store/store.js';
import MainSearch from '../../components/main/MainSearch.jsx';
import TableSearch from '../../components/table/TableSearch.jsx';
import ExcelUploadPopup from '../../components/popup/ExcelUploadPopup.jsx'; // Add this line
import ExcelUploadPopup2 from '../../components/popup/ExcelUploadPopup.jsx'; // Add this line
import common from '../../utils/common';
import styles from '../../components/table/TableSearch.module.css';
import { fetchData } from '../../utils/dataUtils.js';
import { hasPermission } from '../../utils/authUtils.js';
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
    penaltygbn: [
      { value: '', label: '선택하세요' },
      { value: 'local', label: '주정차위반' },
      { value: 'police', label: '경찰청관할' },
    ],
    paymentflag: [
      { value: '', label: '전체' },
      { value: 'Y', label: '납부완료' },
      { value: 'N', label: '미납' },
    ],
  };
  return optionsMap[fieldId] || [];
};

/**
 * 테이블 및 검색 기능 컴포넌트
 * @returns {JSX.Element} 검색 폼과 테이블을 포함한 컴포넌트
 */
const PenaltyListInfo = () => {
  const { user } = useStore();
  const todayDate = common.getTodayDate();  
  const [showExcelPopup, setShowExcelPopup] = useState(false); // Add this line
  const [excelPopupTitle, setExcelPopupTitle] = useState(''); // Add this line
  const [showExcelPopup2, setShowExcelPopup2] = useState(false); // Add this line
  const [excelPopupTitle2, setExcelPopupTitle2] = useState(''); // Add this line

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
  let searchConfig = {
    areas: [
      {
        type: 'search',
        fields: [
          { id: 'penaltygbn', type: 'select', row: 1, label: '과태료구분', labelVisible: true, options: getFieldOptions('penaltygbn'), width: '100px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true },
          { id: 'startDate', type: 'startday', row: 1, label: '납부기한', labelVisible: true, placeholder: '시작일 선택', width: '100px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: false, defaultValue: todayDate },
          { id: 'endDate', type: 'endday', row: 1, label: ' ~ ', labelVisible: true, placeholder: '종료일 선택', width: '100px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: false, defaultValue: todayDate },
          { id: 'carno', type: 'text', row: 1, label: '차량번호', labelVisible: true, maxLength: 50, width: '200px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true },
          { id: 'paymentflag', type: 'select', row: 1, label: '납부여부', labelVisible: true, options: getFieldOptions('paymentflag'), width: '100px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true },
        ],
      },
      {
        type: 'buttons',
        fields: [
          { id: 'searchBtn', type: 'button', row: 1, label: '검색', eventType: 'search', width: '80px', height: '30px', backgroundColor: '#00c4b4', color: '#ffffff', enabled: true },
          { id: 'excelUploadBtn', type: 'button', row: 2, label: '주정차위반 과태료 업로드', eventType: 'showExcelUploadPopup', width: '100px', height: '30px', backgroundColor: '#00c4b4', color: '#ffffff', enabled: true },
          { id: 'excelUploadBtn2', type: 'button', row: 2, label: '경찰청관할 과태료 업로드', eventType: 'showExcelUploadPopup2', width: '100px', height: '30px', backgroundColor: '#00c4b4', color: '#ffffff', enabled: true },
        ],
      },
    ],
  };

  if (!hasPermission(user?.auth, 'permissions')) {
    searchConfig.areas.forEach(area => {
      if (area.type === 'buttons') {
        const index = area.fields.findIndex(field => field.id === 'excelUploadBtn');
        if (index !== -1) {
          area.fields.splice(index, 1);
        }
      }
    });
  };
  
  const [filters, setFilters] = useState(initialFilters(searchConfig.areas.find((area) => area.type === 'search').fields));
  const [tableFilters, setTableFilters] = useState(initialFilters([]));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [isSearched, setIsSearched] = useState(false);
  const [tableStatus, setTableStatus] = useState('initializing');
  const [excelNm, setExcelNm] = useState('');
  const [error, setError] = useState(null);
  const [rowCount, setRowCount] = useState(0);
  const tableRef = useRef(null);
  const tableInstance = useRef(null);
  const isInitialRender = useRef(true);
  const latestFiltersRef = useRef(filters);

  // 최신 필터를 ref에 유지하여 비동기 상태 문제를 방지
  useEffect(() => {
    latestFiltersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    // 테이블 컬럼 재설정
    if(filters.penaltygbn === 'local') {
      tableInstance.current = createTable(tableRef.current, columns1, [], {
        headerHozAlign: "center",
        headerFilter: true,
        layout: 'fitData'
      });
      setExcelNm('주정차위반 과태료 정보.xlsx');
    } else if (filters.penaltygbn === 'police') {
      tableInstance.current = createTable(tableRef.current, columns2, [], {
        headerHozAlign: "center",
        headerFilter: true,
        layout: 'fitData'
      });
      setExcelNm('경찰청관할 과태료 정보.xlsx');
    }
  }, [filters.penaltygbn]);

  // 테이블 컬럼 정의
  const columns1 = [
    { title: '번호', field: 'ID', width: 60, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '자치단체', field: 'LOCAL_GOVERNMENT', minWidth: 80, maxWidth: 400, headerHozAlign: 'center', hozAlign: 'left' },
    { title: '세목/과목', field: 'TAX_ITEM', minWidth: 80, maxWidth: 400, headerHozAlign: 'center', hozAlign: 'left' },
    { title: '과세구분', field: 'TAX_CLASSIFICATION', minWidth: 80, maxWidth: 400, headerHozAlign: 'center', hozAlign: 'center'},
    { title: '과세연월', field: 'TAX_MONTH', headerHozAlign: 'center', hozAlign: 'center' },
    { title: '납세자', field: 'TAXPAYER_NAME', minWidth: 80, maxWidth: 400, headerHozAlign: 'center', hozAlign: 'left' },
    { title: '전자납부번호', field: 'E_PAYMENT_NO', minWidth: 100, maxWidth: 400, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '납부기한', field: 'DUE_DATE', width: 80, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '미체납구분', field: 'DELINQUENCY_STATUS', width: 100, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '납부세액', field: 'PAYABLE_AMOUNT', width: 90, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '과세대상', field: 'TAX_TARGET', minWidth: 100, maxWidth: 400, headerHozAlign: 'center', hozAlign: 'left' },
    { title: '위반장소내용', field: 'VIOLATION_LOCATION', minWidth: 120, maxWidth: 400, headerHozAlign: 'center', hozAlign: 'left' },
    { title: '위반일시내용', field: 'VIOLATION_DATETIME' , minWidth: 120, maxWidth: 400, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '납세번호', field: 'TAXPAYER_ID', minWidth: 240, maxWidth: 400, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '자동납부대상여부', field: 'AUTO_PAYMENT_FLAG', width: 120, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '일부납부진행여부', field: 'PARTIAL_PAYMENT_FLAG', width: 120, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '세입구분', field: 'REVENUE_TYPE', width: 100, headerHozAlign: 'center', hozAlign: 'center'},
    { title: '차량번호', field: 'CARNO', width: 100, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '가상계좌', field: 'VIRTUAL_ACCOUNT', minWidth: 100, maxWidth: 400, headerHozAlign: 'center', hozAlign: 'left' },
    { title: '가상금합계', field: 'SURCHARGE_TOTAL', width: 100, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '납부여부', field: 'PAYMENT_FLAG', width: 100, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '납부자사번', field: 'PAYMENT_EMPNO', width: 100, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '납부자명', field: 'PAYMENT_EMPNM', width: 100, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '납부일시', field: 'PAYMENT_DATETIME', width: 100, headerHozAlign: 'center', hozAlign: 'center' },
  ];

  // 테이블 컬럼 정의
  const columns2 = [
    { title: '번호', field: 'ID', width: 60, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '위반일시', field: 'VIOLATION_DATETIME', minWidth: 80, maxWidth: 400, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '위반장소', field: 'VIOLATION_LOCATION', minWidth: 80, maxWidth: 400, headerHozAlign: 'center', hozAlign: 'left' },
    { title: '위반내용', field: 'VIOLATION_DETAILS', minWidth: 200, maxWidth: 400, headerHozAlign: 'center', hozAlign: 'left'},
    { title: '차량번호', field: 'CARNO', width: 100, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '계좌번호', field: 'VIRTUAL_ACCOUNT', minWidth: 200, maxWidth: 400, headerHozAlign: 'center', hozAlign: 'left' },
    { title: '납부기한', field: 'DUE_DATE', width: 80, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '납부금액', field: 'PAYABLE_AMOUNT', width: 80, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '관할관서', field: 'JURISDICTION_OFFICE', width: 120, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '문의전화번호', field: 'CONTACT_PHONE', width: 120, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '과태료번호', field: 'PENALTY_NOTICE_NO', width: 200, headerHozAlign: 'center', hozAlign: 'center'},
    { title: '납부여부', field: 'PAYMENT_FLAG', width: 100, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '납부자사번', field: 'PAYMENT_EMPNO', width: 100, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '납부자명', field: 'PAYMENT_EMPNM', width: 100, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '납부일시', field: 'PAYMENT_DATETIME', width: 100, headerHozAlign: 'center', hozAlign: 'center' },
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

    // 상태 업데이트 대기
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 최신 필터 사용
    const currentFilters = latestFiltersRef.current;

    if(currentFilters.penaltygbn === '') {
      errorMsgPopup('과태료구분을 선택하세요.');
      setLoading(false);
      return;
    }

    // API 로 통신할 경우 fetchData()
    try {
      const params = {pPENALTYGBN: currentFilters.penaltygbn, pSTDT: currentFilters.startDate, pENDT: currentFilters.endDate, pCARNO: currentFilters.carno || '', pPAYMENTFLAG: currentFilters.paymentflag || '', pEMPNO: user?.empNo, pDEBUG: "F"};

      const response = await fetchData("car/PenaltyInfo", params);
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
    } else if (eventType === 'showExcelUploadPopup') {
      setExcelPopupTitle('주정차위반 과태료 일괄등록');
      setShowExcelPopup(true);
    } else if (eventType === 'showExcelUploadPopup2') {
      setExcelPopupTitle2('경찰청관할 과태료 일괄등록');
      setShowExcelPopup2(true);
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
        tableInstance.current = createTable(tableRef.current, columns1, [], {
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

  return (
    <div className={styles.container}>
      <MainSearch
        config={searchConfig}
        filters={filters}
        setFilters={setFilters}
        onEvent={handleDynamicEvent}
      />
      <TableSearch
        filterFields={[]}
        filters={tableFilters}
        setFilters={setTableFilters}
        onDownloadExcel={() => {handleDownloadExcel(tableInstance.current, tableStatus, excelNm);}}
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
      <ExcelUploadPopup
        show={showExcelPopup}
        onHide={() => setShowExcelPopup(false)}
        onSave={(result) => {
          if (result.errCd === '00') {
            loadData(); // Refresh table on success
          }
          return result;
        }}
        title={excelPopupTitle}
        rptCd="LOCALPENALTYEXCELUPLOAD"
        templateParams={{ pGUBUN: 'RPTCD', pTITLE: '', pFILEID: '15', pRPTCD: 'LOCALPENALTYEXCELUPLOAD', pDEBUG: 'F' }}
      />
      <ExcelUploadPopup2
        show={showExcelPopup2}
        onHide={() => setShowExcelPopup2(false)}
        onSave={(result) => {
          if (result.errCd === '00') {
            loadData(); // Refresh table on success
          }
          return result;
        }}
        title={excelPopupTitle2}
        rptCd="POLICEPENALTYEXCELUPLOAD"
        templateParams={{ pGUBUN: 'RPTCD', pTITLE: '', pFILEID: '16', pRPTCD: 'POLICEPENALTYEXCELUPLOAD', pDEBUG: 'F' }}
      />
    </div>
  );
};

export default PenaltyListInfo;
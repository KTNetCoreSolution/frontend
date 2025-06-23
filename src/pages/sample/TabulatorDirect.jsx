import React, { useState, useEffect, useRef } from 'react';
//import { fetchJsonData } from '../../utils/dataUtils';
//import sampleData from '../../data/data.json';
import { createTable } from '../../utils/tableConfig';
import { initialFilters } from '../../utils/tableEvent';
import { handleDownloadExcel } from '../../utils/tableExcel';
import useStore from '../../store/store';
import MainSearch from '../../components/main/MainSearch';
import TableSearch from '../../components/table/TableSearch';
import CommonPopup from '../../components/popup/CommonPopup';
import UserSearchPopup from '../../components/popup/UserSearchPopup';
import OrgSearchPopup from '../../components/popup/OrgSearchPopup';
import ExcelUploadPopup from '../../components/popup/ExcelUploadPopup'; // Add this line
import styles from '../../components/table/TableSearch.module.css';
import { fetchData } from '../../utils/dataUtils';
import { errorMsgPopup } from '../../utils/errorMsgPopup';

/**
 * 필드 옵션 데이터를 반환
 * @param {string} fieldId - 필드 식별자
 * @param {string} dependentValue - 의존 값
 * @returns {Array} 옵션 배열
 */
const getFieldOptions = (fieldId, dependentValue = '') => {
  const optionsMap = {
    status: [
      { value: '', label: '전체' },
      { value: 'active', label: '활성' },
      { value: 'inactive', label: '비활성' },
    ],
    org1: [
      { value: '', label: '전체' },
      { value: 'org1', label: '강남본부' },
      { value: 'org2', label: '강북본부' },
    ],
    org2: dependentValue === 'org2' ? [
      { value: '', label: '전체' },
      { value: 'org21', label: '테스트지사' },
      { value: 'org22', label: '강북지사' },
      { value: 'org23', label: '하남지사' },
    ] : [{ value: '', label: '전체' }],
    org3: dependentValue === 'org22' ? [
      { value: '', label: '전체' },
      { value: 'org221', label: '노원지점' },
      { value: 'org222', label: '성동지점' },
      { value: 'org223', label: '테스트지점' },
    ] : [{ value: '', label: '전체' }],
    role: [
      { value: 'admin', label: '관리자' },
      { value: 'user', label: '사용자' },
    ],
    filterSelect: [
      { value: '', label: '선택' },
      { value: 'name', label: '이름' },
      { value: 'age', label: '나이' },
      { value: 'status', label: '상태' },
    ],
    orgSelect: [
      { value: '', label: '선택' },
      { value: 'A0001', label: '강남본부' },
      { value: 'A0002', label: '강북본부' },
    ],
  };
  return optionsMap[fieldId] || [];
};

/**
 * 테이블 및 검색 기능 컴포넌트
 * @returns {JSX.Element} 검색 폼과 테이블을 포함한 컴포넌트
 */
const TabulatorDirect = () => {
  const { user } = useStore();
  const [showPopup, setShowPopup] = useState(false);
  const [showExcelPopup, setShowExcelPopup] = useState(false); // Add this line
  const [popupTitle, setPopupTitle] = useState('');
  const [excelPopupTitle, setExcelPopupTitle] = useState(''); // Add this line
  const [popupContent, setPopupContent] = useState(null);
  const [popupOnConfirm, setPopupOnConfirm] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(user?.orgCd || ''); // 조직 선택 팝업용 상태
  const [status2Options, setStatus2Options] = useState(getFieldOptions('org2'));
  const [status3Options, setStatus3Options] = useState(getFieldOptions('org3'));
  const [_selectedUsers, setSelectedUsers] = useState([]);
  const selectedOrgRef = useRef(selectedOrg); // 최신 selectedOrg 값을 추적

  // selectedOrg 변경 시 ref 업데이트
  useEffect(() => {
    selectedOrgRef.current = selectedOrg;
  }, [selectedOrg]);

  // 오늘 날짜 및 월 설정
  const today = new Date();
  const todayDate = today.toISOString().split('T')[0];
  const todayMonth = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;

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
          { id: 'name', type: 'text', row: 1, label: '이름', labelVisible: true, placeholder: '이름 검색', maxLength: 50, width: '200px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true },
          { id: 'status', type: 'select', row: 1, label: '상태', labelVisible: true, options: getFieldOptions('status'), width: '150px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true },
          { id: 'orgText', type: 'text', row: 2, label: '조직예제', labelVisible: true, placeholder: '조직 선택', width: '150px', height: '30px', backgroundColor: '#f0f0f0', color: '#000000', enabled: false },
          { id: 'orgPopupBtn', type: 'popupIcon', row: 2, label: '조직 선택', labelVisible: false, eventType: 'showOrgPopup', width: '30px', height: '30px', backgroundColor: '#f0f0f0', color: '#000000', enabled: true },
          { id: 'userText', type: 'text', row: 2, label: '사용자예제', labelVisible: true, placeholder: '사용자 선택', width: '150px', height: '30px', backgroundColor: '#f0f0f0', color: '#000000', enabled: false },
          { id: 'userPopupBtn', type: 'popupIcon', row: 2, label: '사용자 선택', labelVisible: false, eventType: 'showUserPopup', width: '30px', height: '30px', backgroundColor: '#f0f0f0', color: '#000000', enabled: true },
          { id: 'testSearchBtn', type: 'button', row: 2, label: '팝업', labelVisible: false, eventType: 'testSearch', width: '80px', height: '30px', backgroundColor: '#00c4b4', color: '#ffffff', enabled: true },
          { id: 'status1', type: 'select', row: 3, label: '드롭리스트예제', labelVisible: true, options: getFieldOptions('org1'), width: '150px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true },
          { id: 'status2', type: 'select', row: 3, label: '드롭리스트예제', labelVisible: false, options: status2Options, width: '150px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true },
          { id: 'status3', type: 'select', row: 3, label: '드롭리스트예제', labelVisible: false, options: status3Options, width: '150px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true },
          { id: 'createdDate', type: 'day', row: 4, label: '일자예제', labelVisible: true, placeholder: '날짜 선택', width: '140px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true, defaultValue: todayDate },
          { id: 'rangeStartDate', type: 'startday', row: 5, label: '기간(일자)예제', labelVisible: true, placeholder: '시작일 선택', width: '200px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true, defaultValue: todayDate },
          { id: 'rangeEndDate', type: 'endday', row: 5, label: ' ~ ', labelVisible: true, placeholder: '종료일 선택', width: '200px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true, defaultValue: todayDate },
          { id: 'rangeStartMonth', type: 'startmonth', row: 5, label: '기간(월)예제', labelVisible: true, placeholder: '시작월 선택', width: '200px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true, defaultValue: todayMonth },
          { id: 'rangeEndMonth', type: 'endmonth', row: 5, label: ' ~ ', labelVisible: true, placeholder: '종료월 선택', width: '200px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true, defaultValue: todayMonth },
          { id: 'dayPeriod', type: 'dayperiod', row: 6, label: '날짜범위 예제', labelVisible: true, placeholder: '날짜 범위 선택', width: '200px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true, defaultValue: { start: todayDate, end: todayDate } },
          { id: 'monthPeriod', type: 'monthperiod', row: 6, label: '월범위 예제', labelVisible: true, placeholder: '월 범위 선택', width: '200px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true, defaultValue: { start: todayMonth, end: todayMonth } },
          { id: 'isActive', type: 'checkbox', row: 7, label: '체크박스 예제', labelVisible: true, width: 'default', height: 'default', backgroundColor: 'default', color: 'default', enabled: true },
          { id: 'role', type: 'radio', row: 8, label: '라디오버튼 예제', labelVisible: true, options: getFieldOptions('role'), width: 'default', height: 'default', backgroundColor: 'default', color: 'default', enabled: true },
        ],
      },
      {
        type: 'buttons',
        fields: [
          { id: 'searchBtn', type: 'button', row: 1, label: '검색', eventType: 'search', width: '80px', height: '30px', backgroundColor: '#00c4b4', color: '#ffffff', enabled: true },
          { id: 'resetBtn', type: 'button', row: 8, label: '초기화', eventType: 'reset', width: '80px', height: '30px', backgroundColor: '#00c4b4', color: '#ffffff', enabled: true },
          { id: 'popupBtn2', type: 'button', row: '8', label: '팝업 버튼', eventType: 'showPopup', width: '100px', height: '30px', backgroundColor: '#00c4b4', color: '#ffffff', enabled: true },
          { id: 'excelUploadBtn', type: 'button', row: '8', label: '엑셀업로드', eventType: 'showExcelUploadPopup', width: '100px', height: '30px', backgroundColor: '#00c4b4', color: '#ffffff', enabled: true },
          { id: 'tempUploadBtn', type: 'button', row: '9', label: 'common 팝업 버튼 및 이벤트 및 comfirm메시지 및 파일업로드기능 예제(ExcelUploadTemplateManage.jsx참조)', eventType: 'showTempUploadPopup', width: '680px', height: '30px', backgroundColor: '#00c4b4', color: '#ffffff', enabled: true },
        ],
      },
    ],
  };

  const filterTableFields = [
    { id: 'filterSelect', type: 'select', label: '', options: getFieldOptions('filterSelect'), width: 'default', height: 'default', backgroundColor: 'default', color: 'default', enabled: true },
    { id: 'filterText', type: 'text', label: '', placeholder: '찾을 내용을 입력하세요', width: 'default', height: 'default', backgroundColor: 'default', color: 'default', enabled: true },
  ];

  // const [filters, setFilters] = useState(initialFilters(searchConfig.areas.find((area) => area.type === 'search').fields));
  const [filters, setFilters] = useState({...initialFilters(searchConfig.areas.find((area) => area.type === 'search').fields),    orgText: user?.orgNm || '', });
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

  // 최신 필터를 ref에 유지하여 비동기 상태 문제를 방지
  useEffect(() => {
    latestFiltersRef.current = filters;
  }, [filters]);

  // 테이블 컬럼 정의
  const columns = [
    { title: 'ID', field: 'ID', width: 80, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '이름', field: 'NAME', width: 150, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '나이', field: 'AGE', sorter: 'number', headerHozAlign: 'center', hozAlign: 'center' },
    { title: '상태', field: 'STATUS', headerHozAlign: 'center', hozAlign: 'center' },
    { title: '등록일', field: 'REGDT', headerHozAlign: 'center', hozAlign: 'center' },
    { title: '시작시간', field: 'STARTTIME', headerHozAlign: 'center', hozAlign: 'center' },
    { title: '종료시간', field: 'ENDTIME', headerHozAlign: 'center', hozAlign: 'center' },
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

    // API 로 통신할 경우 fetchData()
    try {
      const params = {pGUBUN: 'LIST', pNAME: currentFilters.name || '',pSTATUS: currentFilters.status || '', pDEBUG: "F"};

      const response = await fetchData("sample/tabulator/list", params);
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

    // JSON으로 만 처리 할때 fetchJsonData()
    /*
    try {
      const params = {
        name: currentFilters.name || '',
        status: currentFilters.status || '',
      };

      const result = await fetchJsonData(sampleData, params);

      // 데이터를 배열로 정규화
      const dataArray = Array.isArray(result) ? result : [result];

      // 클라이언트 측 필터링 적용
      const filteredData = dataArray.filter(item =>
        (!params.name || item.name === params.name) &&
        (!params.status || item.status === params.status)
      );

      setData(filteredData);
    } catch (err) {
      setData([]);
      setError('데이터 로드 실패: ' + err.message);
    } finally {
      setLoading(false);
    }
      */
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
    } else if (eventType === 'reset') {
      setFilters(initialFilters(searchConfig.areas.find((area) => area.type === 'search').fields));
      setData([]);
      setIsSearched(false);
      setSelectedOrg('');
      setStatus2Options(getFieldOptions('org2'));
      setStatus3Options(getFieldOptions('org3'));
      setSelectedUsers([]); // Added: Reset selected users on reset
    } else if (eventType === 'showPopup') {
      setPopupTitle('팝업');
      setPopupContent(`ID: ${eventData.id}에서 호출됨`);
      setPopupOnConfirm(() => () => {
        setShowPopup(false);
        return true;
      });
      setShowPopup(true);
    } else if (eventType === 'showOrgPopup') {
      setPopupTitle('조직 선택');
      setPopupContent(
        <div>
          <OrgSearchPopup
            onClose={() => setShowPopup(false)}
            onConfirm={(selectedRows) => {
              const orgNames = selectedRows.map(row => row.ORGNM).join(', ');
              setSelectedOrg(selectedRows.length > 0 ? selectedRows[0].ORGCD : '');
              setFilters((prev) => ({ ...prev, orgText: orgNames || '' }));
              console.log('Selected Organizations in TabulatorDirect:', selectedRows); // 추가된 디버깅 로그
            }}
          />
        </div>
      );
      setPopupOnConfirm(() => () => {
        setShowPopup(false);
        return true;
      });
      setShowPopup(true);
    } else if (eventType === 'showUserPopup') {
      setPopupTitle('사용자 선택');
      setPopupContent(
        <div>
          <UserSearchPopup
            onClose={() => setShowPopup(false)}
            onConfirm={(selectedRows) => {
              setSelectedUsers(selectedRows);
              const userNames = selectedRows.map(row => row.EMPNM).join(', ');
              setFilters((prev) => ({ ...prev, userText: userNames || '' }));
              console.log('Selected Users:', selectedRows);
            }}
          />
        </div>
      );
      setPopupOnConfirm(() => () => {
        setShowPopup(false);
        return true;
      });
      setShowPopup(true);
    }
    else if (eventType === 'testSearch') {
      setPopupTitle('테스트');
      setPopupContent('테스트 버튼이 클릭되었습니다.');
      setPopupOnConfirm(() => () => {
        setShowPopup(false);
        return true;
      });
      setShowPopup(true);
    } else if (eventType === 'showExcelUploadPopup') {
      setExcelPopupTitle('일괄등록');
      setShowExcelPopup(true);
    } else if (eventType === 'selectChange') {
      const { id, value } = eventData;
      if (id === 'status1') {
        setStatus2Options(getFieldOptions('org2', value));
        setStatus3Options(getFieldOptions('org3'));
        setFilters((prev) => ({ ...prev, status2: '', status3: '' }));
      } else if (id === 'status2') {
        setStatus3Options(getFieldOptions('org3', value));
        setFilters((prev) => ({ ...prev, status3: '' }));
      }
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
          layout: 'fitColumns'
        });

        if (!tableInstance.current) throw new Error("createTable returned undefined or null");
        setTableStatus("ready");

        //3.테블레이터 이벤트 사용 아래 처럼
        //rowClick, rowDblClick, cellClick, cellDblClick, 사이트 참조 ....
        tableInstance.current.on("rowClick", (e, row) => {
          const rowData = row.getData();
          console.log("rowClick:", rowData);
        });

        tableInstance.current.on("cellDblClick", (e, cell) => {
          console.log("cellDblClick:", cell.getField(), cell.getValue());
        });

        //4.그리드내에 체크박스 이벤트 등은 UserSearchPopup.jsx 이 파일 참조
        //tableInstance.current.updateData 기능 등으로 처리해야 그리드내에 값들 즉시 적용됨.


      } catch (err) {
        setTableStatus("error");
        console.error("테이블 초기화 실패패:", err.message);
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
    if (isInitialRender.current || !tableInstance.current || tableStatus !== "ready" || loading) return;
    const { filterSelect, filterText } = tableFilters;
    if (filterText && filterSelect) {
      tableInstance.current.setFilter(filterSelect, "like", filterText);
    } else if (filterText) {
      if (filterText !== "") {
        tableInstance.current.setFilter(
          [
            { field: "MENUNM", type: "like", value: filterText },
            { field: "URL", type: "like", value: filterText },
            { field: "USEYN", type: "like", value: filterText },
          ],
          "or"
        );
      } else {
        tableInstance.current.clearFilter();
      }
    } else if (filterSelect) {
      tableInstance.current.clearFilter();
    }
  }, [tableFilters.filterSelect, tableFilters.filterText, tableStatus, loading]);

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
        onDownloadExcel={() => handleDownloadExcel(tableInstance.current, tableStatus, '테스트.xlsx')}
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
      <CommonPopup
        show={showPopup}
        onHide={() => setShowPopup(false)}
        onConfirm={popupOnConfirm}
        title={popupTitle}
      >
        {popupContent}
      </CommonPopup>
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
        rptCd="exceluploadsample"
        templateParams={{ pGUBUN: 'RPTCD', pTITLE: '', pFILEID: '', pRPTCD: 'exceluploadsample', pDEBUG: 'F' }}
      />
    </div>
  );
};

export default TabulatorDirect;
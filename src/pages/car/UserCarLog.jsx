import React, { useState, useEffect, useRef } from 'react';
import { createTable } from '../../utils/tableConfig.js';
import { initialFilters } from '../../utils/tableEvent.js';
import { handleDownloadExcel2 } from '../../utils/tableExcel.js';
import useStore from '../../store/store.js';
import MainSearch from '../../components/main/MainSearch.jsx';
import TableSearch from '../../components/table/TableSearch.jsx';
import CommonPopup from '../../components/popup/CommonPopup.jsx';
import OrgSearchPopup from '../../components/popup/OrgSearchPopup.jsx';
import UserSearchPopup from '../../components/popup/UserSearchPopup';
import LogRegPopup from './UserCarLogRegPopup.jsx';
import styles from '../../components/table/TableSearch.module.css';
import common from '../../utils/common';
import { hasPermission } from '../../utils/authUtils';
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
    mgmtstatus: [
      { value: '', label: '전체' },
      { value: '운행', label: '운행' },
      { value: '유휴', label: '유휴' },
      { value: '해지', label: '해지' },
    ],
    filterSelect: [
      { value: '', label: '선택' },
      { value: 'ORGNM', label: '소속' },
      { value: 'EMPNO', label: '사번' },
      { value: 'EMPNM', label: '이름' },
    ],
  };
  return optionsMap[fieldId] || [];
};

/**
 * 테이블 및 검색 기능 컴포넌트
 * @returns {JSX.Element} 검색 폼과 테이블을 포함한 컴포넌트
 */
const UserCarLog = () => {
  const { user } = useStore();
  const [showPopup, setShowPopup] = useState(false);
  const [showRegPopup, setShowRegPopup] = useState(false);  
  const regInitalizeData = {LOGDATE: '', LOGSTTIME: '', CARID: '', EMPNO: ''};
  const [regData, setRegData] = useState(regInitalizeData);
  const [popupTitle, setPopupTitle] = useState('');
  const [popupContent, setPopupContent] = useState(null);
  const [popupOnConfirm, setPopupOnConfirm] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(user?.orgCd || ''); // 조직 선택 팝업용 상태
  const [selectedOrgNm, setSelectedOrgNm] = useState(user?.orgNm || ''); // 조직 선택 팝업용 상태
  const [selectedUsers, setSelectedUsers] = useState('');
  const selectedOrgRef = useRef(selectedOrg); // 최신 selectedOrg 값을 추적
  const todayDate = common.getTodayDate();  

  const fn_CellButton = (label, className, onClick) => ({
    formatter: (cell) => {
      const field = cell.getField();
      const row = cell.getRow();
      const rowData = row.getData();
      const confYn = rowData.CONFYN;
      const logStat = rowData.LOGSTAT;
      let bBtn = false;

      console.log('confYn:' + confYn);
      console.log('logStat:' + confYn);
      if (field === 'actions' && (logStat === 'R' && (confYn === 'Y'|| hasPermission(user?.auth, 'permissions'))) ) {
        bBtn = true;
      } else if (field === 'DETAIL') {
        bBtn = true;
      }

      // if (bBtn) {
      //   const button = document.createElement("button");
      //   button.className = `btn btn-sm ${className}`;
      //   button.innerText = label;
      //   button.onclick = () => onClick(cell.getData());
      //   return button;
      // }
      if (bBtn) {
        const wrapper = document.createElement("div");
        wrapper.style.display = "flex";
        wrapper.style.justifyContent = "center";
        wrapper.style.alignItems = "center";
        wrapper.style.height = "100%";

        const button = document.createElement("button");
        button.className = `btn btn-sm ${className}`;
        button.innerText = label;
        button.onclick = (e) => {
          e.stopPropagation(); // 행 클릭 이벤트와 충돌 방지
          onClick(cell.getData());
        };

        wrapper.appendChild(button);
        return wrapper;
      }
      else {
        return '';
      }
    },
  });

  const fn_RegPopup = (data) => {
    setRegData(data);
    setShowRegPopup(true);
  };

  const handleRegCancel = () => {
    setRegData(regInitalizeData);
    setShowRegPopup(false);
  };

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
          { id: 'startDate', type: 'startday', row: 1, label: '기간', labelVisible: true, placeholder: '시작일 선택', width: '100px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: false, defaultValue: todayDate },
          { id: 'endDate', type: 'endday', row: 1, label: ' ~ ', labelVisible: true, placeholder: '종료일 선택', width: '100px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: false, defaultValue: todayDate },
          { id: 'orgText', type: 'text', row: 1, label: '조직', labelVisible: true, placeholder: '조직 선택', width: '150px', height: '30px', backgroundColor: '#f0f0f0', color: '#000000', enabled: false },
          { id: 'orgPopupBtn', type: 'popupIcon', row: 1, label: '조직 선택', labelVisible: false, eventType: 'showOrgPopup', width: '30px', height: '30px', backgroundColor: '#f0f0f0', color: '#000000', enabled: true },
          { id: 'carno', type: 'text', row: 1, label: '차량번호', labelVisible: true, maxLength: 50, width: '150px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true },
          { id: 'userText', type: 'text', row: 1, label: '이름', labelVisible: true, width: '100px', height: '30px', backgroundColor: '#f0f0f0', color: '#000000', enabled: false },
          { id: 'userPopupBtn', type: 'popupIcon', row: 1, label: '사용자 선택', labelVisible: false, eventType: 'showUserPopup', width: '30px', height: '30px', backgroundColor: '#f0f0f0', color: '#000000', enabled: true },
          { id: 'mgmtstatus', type: 'select', row: 1, label: '운용관리상태', labelVisible: true, options: getFieldOptions('mgmtstatus'), width: '100px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true },
        ],
      },
      {
        type: 'buttons',
        fields: [
          { id: 'searchBtn', type: 'button', row: 1, label: '검색', eventType: 'search', width: '80px', height: '30px', backgroundColor: '#00c4b4', color: '#ffffff', enabled: true },
          { id: 'popupBtn', type: 'button', row: 1, label: '운행일지등록', eventType: 'showRegPopup', width: '100px', height: '30px', backgroundColor: '#00c4b4', color: '#ffffff', enabled: true },
        ],
      },
    ],
  };

  const [filterTableFields, setFilterTableFields] = useState([
    { id: 'filterSelect', type: 'select', label: '', options: getFieldOptions('filterSelect'), width: 'default', height: 'default', backgroundColor: 'default', color: 'default' },
    { id: 'filterValue', type: 'text', label: '', width: 'default', height: 'default', backgroundColor: 'default', color: 'default', disabled: 'disabled' },
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

  let visibleColumns = ['actions|N', 'applyTarget|N', 'DETAIL|N'];  

  // 테이블 컬럼 정의
  const columns = [   
    { title: "작업", field: "actions", width: 65, frozen: true, headerHozAlign: "center", hozAlign: "center", visible: false, ...fn_CellButton("승인", `btn-danger ${styles.deleteButton}`, (rowData) => handleIsConfrim(rowData)) },
    {
      title: "작업대상", field: "applyTarget", width: 90, frozen: true, headerHozAlign: "center", hozAlign: "center", sorter: "string", visible: false,
      formatter: (cell) => {
        const rowData = cell.getRow().getData();
        let label = "";
        let stateField = "";
        if (rowData.isConfirm === "Y") {
          label = "승인";
          stateField = "isConfirm"
        }
        if (!label) return "";
        const div = document.createElement("div");
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.justifyContent = "center";
        div.style.gap = "5px";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "checkbox-custom";
        checkbox.checked = rowData[stateField] === "Y";
        checkbox.onclick = () => {
          setTimeout(() => {
            setData((prevData) =>
              prevData.map((row) => {
                if (row.ID === rowData.ID) {
                  const updatedRow = { ...row, [stateField]: checkbox.checked ? "Y" : "N" };
                  if (stateField === "isConfirm" && !checkbox.checked) {
                    updatedRow.isConfirm = "N";
                  }
                  return updatedRow;
                }
                return row;
              }).filter(Boolean)
            );
          }, 0);
        };
        const span = document.createElement("span");
        span.innerText = label;
        div.appendChild(checkbox);
        div.appendChild(span);
        return div;
      },
    },
    { title: '번호', field: 'ID', width: 60, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '운행일', field: 'LOGDATE', width: 90, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '시작시간', field: 'LOGSTTIME', width: 80, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '종료시간', field: 'LOGENTIME', width: 80, headerHozAlign: 'center', hozAlign: 'center'},
    { title: '운행시간', field: 'DIFFTIME', width: 100, headerHozAlign: 'center', hozAlign: 'center'},
    { title: '조직', field: 'ORG_GROUP', width: 100, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '본부', field: 'ORGNMLV1', width: 90, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '설계부/운용센터', field: 'ORGNMLV2', width: 120, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '부', field: 'ORGNMLV3', width: 120, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '팀', field: 'ORGNMLV4', width: 120, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '차대번호', field: 'CARID', width: 160, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '차량번호', field: 'CARNO', width: 80, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '사번', field: 'EMPNO', width: 80, headerHozAlign: 'center', hozAlign: 'center'},
    { title: '이름', field: 'EMPNM', width: 80, headerHozAlign: 'center', hozAlign: 'center'},
    { title: '시작km', field: 'STKM', headerHozAlign: 'center', hozAlign: 'center' },
    { title: '종료km', field: 'ENKM', headerHozAlign: 'center', hozAlign: 'center' },
    { title: '운행거리', field: 'LEAVEKM', headerHozAlign: 'center', hozAlign: 'center' },
    { title: '주유(ℓ)', field: 'FUEL', headerHozAlign: 'center', hozAlign: 'center' },
    { title: '비고', field: 'NOTE', headerHozAlign: 'center', hozAlign: 'center', visible: false },
    { title: '승인여부', field: 'LOGSTAT', headerHozAlign: 'center', hozAlign: 'center', visible: false },
    { title: '승인상태', field: 'LOGSTATNM', headerHozAlign: 'center', hozAlign: 'center' },
    { title: '상세', field: 'DETAIL', headerHozAlign: 'center', hozAlign: 'center', ...fn_CellButton('상세보기', `btn btn-outline-secondary`, (rowData) => handleDetail(rowData)) },
  ];

  const handleIsConfrim = (rowData) => {
    setTimeout(() => {
      const newIsConfirm = rowData.isConfirm === "Y" ? "N" : "Y";
      setData((prevData) =>
        prevData.map((r) =>
          r.ID === rowData.ID
            ? { ...r, isConfirm: newIsConfirm }
            : r
        )
      );
    }, 0);
  };

  const handleDetail = (rowData) => {
    fn_RegPopup(rowData);
  };

  const handleConfrim = async (e) => {
    e.preventDefault();

    const changedRows = data.filter((row) => (row.isConfirm === 'Y'));
    
    if (changedRows.length === 0) {
      errorMsgPopup("변경된 데이터가 없습니다.");
      return;
    }
    
    if(!confirm('선택한 운행일지를 승인 하시겠습니까?')) {
      return;
    }

    setLoading(true);

    try {
      const promises = changedRows.map(async (row) => {
        const params = { pLOGDATE: row.LOGDATE, pLOGSTTIME: row.LOGSTTIME, pCARID: row.CARID, pLOGSTAT: 'Y', pTRTEMPNO: user?.empNo };

        try {
          const response = await fetchData("carlog/logConfirmTransaction", params );
          if (!response.success) {
            throw new Error(response.message || `Failed to ${row.LOGDATE} ${row.LOGSTTIME} ${row.CARID}`);
          }
          return { ...row, success: true };
        } catch (error) {
          console.error(`Error processing ${row.LOGDATE} ${row.LOGSTTIME} ${row.CARID}`, error);
          return { ...row, success: false, error: error.message };
        }
      });

      const results = await Promise.all(promises);
      const errors = results.filter((result) => !result.success);

      if (errors.length > 0) {
        errorMsgPopup(`일부 작업이 실패했습니다: ${errors.map((e) => e.error).join(", ")}`);
      } else {
        msgPopup("선택한 대상이 성공적으로 승인되었습니다.");
        await loadData();
      }
    } catch (err) {
      setLoading(false);
    }
  };

  const handleConfrimAll = async (e) => {
    e.preventDefault();
    
    if(!confirm('승인 대기 중인 운행일지를 모두 승인하시겠습니까?')) {
      return;
    }
    try {
      const params = { pTRTEMPNO: user?.empNo };
      
      const response = await fetchData('carlog/logConfirmAllTransaction', params);

      if (!response.success) {
        throw new Error(response.errMsg || '운행일지 일괄승인 중 오류가 발생했습니다. 다시 시도해주세요.');
      } else {
        if (response.errMsg !== '' || response.data[0].errCd !== '00') {
          let errMsg = response.errMsg;

          if (response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;

          errorMsgPopup(errMsg);
        } else {
          msgPopup("운행일지 일괄 승인 되었습니다.");
          await loadData();
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      errorMsgPopup(error.message || '운행일지 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };
  
  // 데이터 로드 함수
  /**
   * JSON 데이터를 가져오고 클라이언트 측에서 필터링하여 테이블 데이터를 로드
   * @async
   */
  const loadData = async () => {
    if (isInitialRender.current || !tableInstance.current || tableStatus !== 'ready' || loading) return;
    
    setLoading(true);
    setIsSearched(true);
    setError(null);
    setTableFilters(initialFilters(filterTableFields)); 

    setFilterTableFields((prevFields) => {
      return prevFields.map((filter) => {
        if (filter.id === 'filterSelect') {  
          return { ...filter };
        } else {
          return { ...filter, disabled: 'disabled', value: '' }; // 기본적으로 숨김 처리
        }
      });
    });    

    // 상태 업데이트 대기
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 최신 필터 사용
    const currentFilters = latestFiltersRef.current;

    // API 로 통신할 경우 fetchData()
    try {
      const params = {pSTDT: currentFilters.startDate, pENDT: currentFilters.endDate, pORGCD: selectedOrgRef.current, pCARNO: currentFilters.carno || '', pEMPNO: selectedUsers || '', pSTATUS: currentFilters.mgmtstatus || '', pTRTEMPNO: user?.empNo, pDEBUG: "F"};

      const response = await fetchData("carlog/logInfoList", params);
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
      const confirmData = responseData.map((row) => ({
        ...row,
        isConfirm: "N",
      }));
      setData(confirmData);
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
    } else if (eventType === 'showUserPopup') {
      setPopupTitle('사용자 선택');
      setPopupContent(
        <div>
          <UserSearchPopup
            onClose={() => setShowPopup(false)}
            onConfirm={(selectedRows) => {
              const empNo = selectedRows.map((row) => row.EMPNO).join(', ');
              const userNames = selectedRows.map((row) => row.EMPNM).join(', ');
              setSelectedUsers(empNo);
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
    } else if (eventType === 'showRegPopup') {
      fn_RegPopup(regInitalizeData);
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

      if (hasPermission(user?.auth, 'permissions') || user?.levelCd === '41') {
        visibleColumns = ['actions|Y', 'applyTarget|Y', 'DETAIL|Y'];
      } else {
        visibleColumns = [];
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

      if (user?.levelCd === '41' || hasPermission(user?.auth, 'permissions')) {
        table.showColumn('actions');
        table.showColumn('applyTarget');
      } else {
        table.hideColumn('actions');
        table.hideColumn('applyTarget');
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
    if (isInitialRender.current || !tableInstance.current || tableStatus !== 'ready' || loading) return;
    const { filterSelect, filterText } = tableFilters;

    setFilterTableFields((prevFields) => {
      return prevFields.map((filter) => {
        if (filter.id === 'filterSelect') {  
          return { ...filter };
        } else {
          return { ...filter, disabled: filterSelect !== '' ? '' : 'disabled', value: '' }; // 기본적으로 숨김 처리
        }
      });
    });
        
    if (filterText && filterSelect) {
      tableInstance.current.setFilter(filterSelect, 'like', filterText);
    } else {
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
        onDownloadExcel={() => {handleDownloadExcel2(tableInstance.current, tableStatus, '기동장비운행일지.xlsx', visibleColumns)}}
        rowCount={rowCount}
        onEvent={handleDynamicEvent}
      >
      <div className='btnGroupCustom' style={{display:user?.levelCd === '41' || hasPermission(user?.auth, 'permissions') ? 'flex' : 'none'}}>
        <button className='btn text-bg-success' onClick={handleConfrim}>
          선택승인
        </button>
        <button className='btn text-bg-success' style={{display:user?.levelCd === '41' ? 'flex' : 'none'}} onClick={handleConfrimAll}>
          일괄승인
        </button>
      </div>
      </TableSearch>
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
      <LogRegPopup show={showRegPopup} onHide={handleRegCancel} onParentSearch={loadData} data={regData} />
    </div>
  );
};

export default UserCarLog
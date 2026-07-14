import React, { useState, useEffect, useRef } from 'react';
import { createTable } from '../../utils/tableConfig.js';
import { initialFilters } from '../../utils/tableEvent.js';
import { handleDownloadExcel2 } from '../../utils/tableExcel.js';
import useStore from '../../store/store.js';
import MainSearch from '../../components/main/MainSearch.jsx';
import TableSearch from '../../components/table/TableSearch.jsx';
import CommonPopup from "../../components/popup/CommonPopup";
import UserSearchPopup from "../../components/popup/UserSearchPopup";
import ExcelUploadPopup from '../../components/popup/ExcelUploadPopup.jsx'; // Add this line
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
const getFieldOptions = (fieldId, dependentValue = '', orgList = []) => {
  const optionsMap = {
    selectgbn: [
      { value: 'OFCTOORG', label: '국사-조직정보' },
      { value: 'ADDRTOOFC', label: '주소-국사기본정보' },
      { value: 'ORGTOADDR', label: '조직-주소매핑정보' },
    ],
    filterSelect: [
      { value: '', label: '선택' }, 
      { value: 'OFFICECD', label: '국사코드' },
      { value: 'OFFICENM', label: '국사명' },
      { value: 'LEGDONGNM', label: '동/도로명' },
    ],
  };
  return optionsMap[fieldId] || [];
};

const fn_CellButton = (label, className, onClick) => ({
  formatter: (cell) => {
    const button = document.createElement("button");
    button.className = `btn btn-sm ${className}`;
    button.innerText = label;
    button.onclick = () => onClick(cell.getData());
    return button;
  },
});

/**
 * 테이블 및 검색 기능 컴포넌트
 * @returns {JSX.Element} 검색 폼과 테이블을 포함한 컴포넌트
 */
const OrgManageInfo = () => {
  const { user } = useStore();
  const [showDetailPopup, setShowDetailPopup] = useState(false);  
  const [showOfcExcelPopup, setShowOfcExcelPopup] = useState(false); // Add this line
  const [ofcExcelPopupTitle, setOfcExcelPopupTitle] = useState(''); // Add this line
  const [showAddrExcelPopup, setShowAddrExcelPopup] = useState(false); // Add this line
  const [addrExcelPopupTitle, setAddrExcelPopupTitle] = useState(''); // Add this line
  const [_selectedUsers] = useState([]);

  const fn_DetailPopup = (data) => {
    setRegCode(data);
    setShowDetailPopup(true);
  };

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
          { id: 'selectgbn', type: 'select', row: 1, label: '조회구분', labelVisible: true, options: getFieldOptions('selectgbn'), width: '200px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true },
        ],
      },
      {
        type: 'buttons',
        fields: [
          { id: 'searchBtn', type: 'button', row: 1, label: '검색', eventType: 'search', width: '80px', height: '30px', backgroundColor: '#00c4b4', color: '#ffffff', enabled: true },
          { id: 'OfcUploadBtn', type: 'button', row: 2, label: '국사-조직정보 업로드', eventType: 'showOfcUploadPopup', width: '100px', height: '30px', backgroundColor: '#00c4b4', color: '#ffffff', enabled: true },
          { id: 'AddrUploadBtn', type: 'button', row: 2, label: '주소-국사정보 업로드', eventType: 'showAddrUploadPopup', width: '100px', height: '30px', backgroundColor: '#00c4b4', color: '#ffffff', enabled: true },
        ],
      },
    ],
  };

  if (!hasPermission(user?.auth, 'permissions')) {
    searchConfig.areas.forEach(area => {
      if (area.type === 'buttons') {
        const index = area.fields.findIndex(field => field.id === 'OfcUploadBtn');
        if (index !== -1) {
          area.fields.splice(index, 1);
        }

        const index2 = area.fields.findIndex(field => field.id === 'AddrUploadBtn');
        if (index2 !== -1) {
          area.fields.splice(index2, 1);
        }
      }
    });
  };

  const [filterTableFields, setFilterTableFields] = useState([
    { id: 'filterSelect', type: 'select', label: '', options: getFieldOptions('filterSelect'), width: 'default', height: 'default', backgroundColor: 'default', color: 'default' },
    { id: 'filterValue', type: 'text', label: '', width: '150px', height: 'default', backgroundColor: 'default', color: 'default', disabled: 'disabled' },
  ]);
  
  const [filters, setFilters] = useState(initialFilters(searchConfig.areas.find((area) => area.type === 'search').fields));
  const [tableFilters, setTableFilters] = useState(initialFilters(filterTableFields));

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [isSearched, setIsSearched] = useState(false);
  const [tableStatus, setTableStatus] = useState('initializing');
  const [excelNm, setExcelNm] = useState('국사-조직정보.xlsx');
  const [selectedRowData, setSelectedRowData] = useState(null);
  const [targetField, setTargetField] = useState(null);
  const [showUserPopup, setShowUserPopup] = useState(false);
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

  useEffect(() => {
    // 테이블 컬럼 재설정
    if(filters.selectgbn === 'OFCTOORG') {
      tableInstance.current = createTable(tableRef.current, columns1, [], {
        headerHozAlign: "center",
        headerFilter: true,
        layout: 'fitData'
      });
      setRowCount(0);
      setExcelNm('국사-조직정보.xlsx');
      setVisibleColumns(['applyTarget|N']);
    } else if (filters.selectgbn === 'ADDRTOOFC') {
      tableInstance.current = createTable(tableRef.current, columns2, [], {
        headerHozAlign: "center",
        headerFilter: true,
        layout: 'fitData'
      });
      setRowCount(0);
      setExcelNm('주소-국사기본정보.xlsx');
      setVisibleColumns([]);
    } else if (filters.selectgbn === 'ORGTOADDR') {
      tableInstance.current = createTable(tableRef.current, columns3, [], {
        headerHozAlign: "center",
        headerFilter: true,
        layout: 'fitData'
      });
      setRowCount(0);
      setExcelNm('조직-주소매핑정보.xlsx');
      setVisibleColumns([]);
    }
  }, [filters.selectgbn]);

  const handleUserConfirm = (selectedRows) => {
    if (!selectedRowData) return;

    const user = selectedRows[0];
    const newEmpNo = user.EMPNO || "";
    const newEmpNm = user.EMPNM || "";

    if (!newEmpNo) {
      errorMsgPopup("선택된 사원정보가 없습니다.");
      return;
    }

    setData((prevData) => prevData.map((row) => {
      if (String(row.ID) === String(selectedRowData.ID)) {
        // targetField는 항상 ID 필드 (BIZ_LEADER 등)
        const idField = targetField;
        const nameField = targetField
          .replace('_LEADER', '_LEADERNM')
          .replace('_MANAGER', '_MANAGERNM')
          .replace('_FM1', '_FM1NM')
          .replace('_FM2', '_FM2NM');
          
        const oldEmpNo = (row[idField] || "").trim();
        const oldEmpNm = (row[nameField] || "").trim();

        // 실제로 값이 변경되었는지 확인
        const isActuallyChanged = newEmpNo !== oldEmpNo || newEmpNm !== oldEmpNm;

        const updatedRow = { 
          ...row,
          [idField]: newEmpNo,
          [nameField]: newEmpNm
        };

        // 실제 변경된 경우에만 isChanged = "Y"
        if (isActuallyChanged) {
          updatedRow.isChanged = "Y";
        }

        return updatedRow;
      }
      return row;
    }));

    if (tableInstance.current) tableInstance.current.redraw();

    setShowUserPopup(false);
    setSelectedRowData(null);
    setTargetField(null);
  };

  const handleUserCancel = () => {
    setShowUserPopup(false);
    setSelectedRowData(null);
    setTargetField(null);
  };

  const createUserFormatter = (fieldName) => (cell) => {
    const rowData = cell.getRow().getData();
    cell.getElement().style.backgroundColor = "#eaeaea";

    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.alignItems = "center";

    const span = document.createElement("span");
    span.innerText = rowData[fieldName] || "";
    span.style.cursor = "pointer";
    span.style.flex = "1";

    div.appendChild(span);
    return div;
  };

  const cellClickHandler = (e, cell) => {
    const rowData = cell.getRow().getData();

    setSelectedRowData(rowData);    
    setShowUserPopup(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    const changedRows = data.filter((row) => row.isChanged === "Y");
    if (changedRows.length === 0) {
      errorMsgPopup("변경된 데이터가 없습니다.");
      return;
    }

    setLoading(true);

    try {
      const promises = changedRows.map(async (row) => {
        const params = {
            OFFICECD: row.OFFICECD,
            BIZ_LEADER: row.BIZ_LEADER,
            BIZ_FM1: row.BIZ_FM1,
            BIZ_FM2: row.BIZ_FM2,
            LINE_LEADER: row.LINE_LEADER,
            LINE_MANAGER: row.LINE_MANAGER,
            DESIGN_LEADER: row.DESIGN_LEADER,
            DESIGN_MANAGER: row.DESIGN_MANAGER,
            REGEMPNO: user?.empNo || "",
        };
        
        try {
          const response = await fetchData("OrgMngInfo/managerSave", params);
          if (!response.success) {
            throw new Error(response.message || `Failed to save auth for ID: ${row.ID}`);
          }
          return { ...row, success: true };
        } catch (error) {
          console.error(`Error processing save for ID: ${row.ID}`, error);
          return { ...row, success: false, error: error.message };
        }
      });
      const results = await Promise.all(promises);
      const errors = results.filter((result) => !result.success);
      if (errors.length > 0) {
        errorMsgPopup(`일부 작업이 실패했습니다: ${errors.map((e) => e.error).join(", ")}`);
      } else {
        msgPopup("모든 변경사항이 성공적으로 저장되었습니다.");
        await loadData();
      }
    } catch (err) {
      console.error("Save operation failed:", err);
      errorMsgPopup(err.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };
  
  // 국사-조직정보 테이블 컬럼 정의
  const columns1 = [
    { frozen: true, headerHozAlign: "center", hozAlign: "center", title: "작업대상", field: "applyTarget", sorter: "string", width: 100, formatter: (cell) => {
            const rowData = cell.getRow().getData();
            let label = rowData.isChanged === "Y" ? "변경" : "";  
            if (!label) return "";
            const div = document.createElement("div");
            div.style.display = "flex"; div.style.alignItems = "center"; div.style.justifyContent = "center"; div.style.gap = "5px";
            const checkbox = document.createElement("input"); checkbox.type = "checkbox"; checkbox.checked = rowData.isChanged === "Y";
            checkbox.onclick = () => {
              setTimeout(() => {
                setData((prevData) => prevData.map((row) => row.OFFICECD === rowData.OFFICECD ? { ...row, isChanged: checkbox.checked ? "Y" : "N" } : row));
              }, 0);
            };
            const span = document.createElement("span"); span.innerText = label;
            div.appendChild(checkbox); div.appendChild(span);
            return div;
          }
    },
    { title: '번호', field: 'ID', width: 60, headerHozAlign: 'center', hozAlign: 'center' },
    {
      title: '국사', headerHozAlign: 'center', hozAlign: "center",
      columns: [
        { title: '국사코드', field: 'OFFICECD', width: 80, headerHozAlign: 'center', hozAlign: 'center'},
        { title: '조직명', field: 'OFFICENM', width: 110, headerHozAlign: 'center', hozAlign: 'center'},
        { title: '국사명', field: 'OFFICENM2', width: 80, headerHozAlign: 'center', hozAlign: 'center'},
      ]
    },
    {
      title: 'Biz기술', headerHozAlign: 'center', hozAlign: "center",
      columns: [
        { title: '부', field: 'BIZ_LV2NM', width: 120, headerHozAlign: 'center', hozAlign: 'center'},
        { title: '팀', field: 'BIZ_LV3NM', width: 120, headerHozAlign: 'center', hozAlign: 'center'},
        { title: '팀코드', field: 'BIZ_UPPERCD', width: 80, headerHozAlign: 'center', hozAlign: 'center'},
      ]
    },
    {
      title: '선로', headerHozAlign: 'center', hozAlign: "center",
      columns: [
        { title: '본부', field: 'LINE_LV1NM', width: 80, headerHozAlign: 'center', hozAlign: 'center'},
        { title: '센터', field: 'LINE_LV2NM', width: 120, headerHozAlign: 'center', hozAlign: 'center'},
        { title: '부', field: 'LINE_LV3NM', width: 120, headerHozAlign: 'center', hozAlign: 'center'},
        { title: '팀', field: 'LINE_LV4NM', width: 120, headerHozAlign: 'center', hozAlign: 'center'},
        { title: '팀코드', field: 'LINE_UPPERCD', width: 80, headerHozAlign: 'center', hozAlign: 'center'},
      ]
    },
    {
      title: '설계', headerHozAlign: 'center', hozAlign: "center",
      columns: [
        { title: '본부', field: 'DESIGN_LV1NM', width: 80, headerHozAlign: 'center', hozAlign: 'center'},
        { title: '센터', field: 'DESIGN_LV2NM', width: 120, headerHozAlign: 'center', hozAlign: 'center'},
        { title: '팀', field: 'DESIGN_LV3NM', width: 120, headerHozAlign: 'center', hozAlign: 'center'},
        { title: '팀코드', field: 'DESIGN_UPPERCD', width: 80, headerHozAlign: 'center', hozAlign: 'center'},
      ]
    },
    {
      title: 'Biz', headerHozAlign: 'center', hozAlign: "center",
      columns: [
        { title: '팀장', field: 'BIZ_LEADERNM', width: 100, headerHozAlign: 'center', hozAlign: 'center', formatter: createUserFormatter("BIZ_LEADERNM"), cellClick: (e, cell) => {cellClickHandler(e, cell); setTargetField("BIZ_LEADER");}},
        { title: '팀장사번', field: 'BIZ_LEADER', width: 100, headerHozAlign: 'center', hozAlign: 'center', formatter: createUserFormatter("BIZ_LEADER"), cellClick: (e, cell) => {cellClickHandler(e, cell); setTargetField("BIZ_LEADER");}},
        { title: 'FM1', field: 'BIZ_FM1NM', width: 100, headerHozAlign: 'center', hozAlign: 'center', formatter: createUserFormatter("BIZ_FM1NM"), cellClick: (e, cell) => {cellClickHandler(e, cell); setTargetField("BIZ_FM1");}},
        { title: 'FM1사번', field: 'BIZ_FM1', width: 100, headerHozAlign: 'center', hozAlign: 'center', formatter: createUserFormatter("BIZ_FM1"), cellClick: (e, cell) => {cellClickHandler(e, cell); setTargetField("BIZ_FM1");}},
        { title: 'FM2', field: 'BIZ_FM2NM', width: 100, headerHozAlign: 'center', hozAlign: 'center', formatter: createUserFormatter("BIZ_FM2NM"), cellClick: (e, cell) => {cellClickHandler(e, cell); setTargetField("BIZ_FM2");}},
        { title: 'FM2사번', field: 'BIZ_FM2', width: 100, headerHozAlign: 'center', hozAlign: 'center', formatter: createUserFormatter("BIZ_FM2"), cellClick: (e, cell) => {cellClickHandler(e, cell); setTargetField("BIZ_FM2");}},
      ]
    },
    {
      title: '선로', headerHozAlign: 'center', hozAlign: "center",
      columns: [
        { title: '팀장', field: 'LINE_LEADERNM', width: 100, headerHozAlign: 'center', hozAlign: 'center', formatter: createUserFormatter("LINE_LEADERNM"), cellClick: (e, cell) => {cellClickHandler(e, cell); setTargetField("LINE_LEADER");}},
        { title: '팀장사번', field: 'LINE_LEADER', width: 100, headerHozAlign: 'center', hozAlign: 'center', formatter: createUserFormatter("LINE_LEADER"), cellClick: (e, cell) => {cellClickHandler(e, cell); setTargetField("LINE_LEADER");}},
        { title: '담당자', field: 'LINE_MANAGERNM', width: 100, headerHozAlign: 'center', hozAlign: 'center', formatter: createUserFormatter("LINE_MANAGERNM"), cellClick: (e, cell) => {cellClickHandler(e, cell); setTargetField("LINE_MANAGER");}},
        { title: '담당자사번', field: 'LINE_MANAGER', width: 100, headerHozAlign: 'center', hozAlign: 'center', formatter: createUserFormatter("LINE_MANAGER"), cellClick: (e, cell) => {cellClickHandler(e, cell); setTargetField("LINE_MANAGER");}},
      ]
    },
    {
      title: '설계', headerHozAlign: 'center', hozAlign: "center",
      columns: [
        { title: '팀장', field: 'DESIGN_LEADERNM', width: 100, headerHozAlign: 'center', hozAlign: 'center', formatter: createUserFormatter("DESIGN_LEADERNM"), cellClick: (e, cell) => {cellClickHandler(e, cell); setTargetField("DESIGN_LEADER");}},
        { title: '팀장사번', field: 'DESIGN_LEADER', width: 100, headerHozAlign: 'center', hozAlign: 'center', formatter: createUserFormatter("DESIGN_LEADER"), cellClick: (e, cell) => {cellClickHandler(e, cell); setTargetField("DESIGN_LEADER");}},
        { title: '담당자', field: 'DESIGN_MANAGERNM', width: 100, headerHozAlign: 'center', hozAlign: 'center', formatter: createUserFormatter("DESIGN_MANAGERNM"), cellClick: (e, cell) => {cellClickHandler(e, cell); setTargetField("DESIGN_MANAGER");}},
        { title: '담당자사번', field: 'DESIGN_MANAGER', width: 100, headerHozAlign: 'center', hozAlign: 'center', formatter: createUserFormatter("DESIGN_MANAGER"), cellClick: (e, cell) => {cellClickHandler(e, cell); setTargetField("DESIGN_MANAGER");}},
      ]
    },
  ];

  // 주소-국사기본정보 테이블 컬럼 정의
  const columns2 = [
    { title: '번호', field: 'ID', width: 60, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '주소관리코드', field: 'CELLID', width: 120, headerHozAlign: 'center', hozAlign: 'center'},
    { title: '주소관리명', field: 'CELLNM', width: 200, headerHozAlign: 'center', hozAlign: 'left'},
    { title: '동/도로명코드', field: 'LEGDONGCD', width: 100, headerHozAlign: 'center', hozAlign: 'center'},
    { title: '시작번지', field: 'STBJNO', width: 80, headerHozAlign: 'center', hozAlign: 'center'},
    { title: '끝번지', field: 'FNSBJNO', width: 80, headerHozAlign: 'center', hozAlign: 'center'},
    { title: '시작호수', field: 'STHHONO', width: 80, headerHozAlign: 'center', hozAlign: 'center'},
    { title: '끝호수', field: 'FNSHHONO', width: 80, headerHozAlign: 'center', hozAlign: 'center'},
    { title: '동/도로명', field: 'LEGDONGNM', width: 120, headerHozAlign: 'center', hozAlign: 'center'},
    { title: '전체주소', field: 'DONG_FULL_NM', width: 250, headerHozAlign: 'center', hozAlign: 'left'},
    { title: '국사코드', field: 'OFFICECD', width: 80, headerHozAlign: 'center', hozAlign: 'center'},
    { title: '국사명', field: 'OFFICENM', width: 150, headerHozAlign: 'center', hozAlign: 'center'},
  ];

  //조직-주소매핑정보 테이블 컬럼 정의
  const columns3 = [
    { title: '번호', field: 'ID', width: 60, headerHozAlign: 'center', hozAlign: 'center' },
    { title: '전체주소', field: 'DONG_FULL_NM', width: 250, headerHozAlign: 'center', hozAlign: 'left'},
    { title: '동/도로명', field: 'LEGDONGNM', width: 120, headerHozAlign: 'center', hozAlign: 'center'},
    { title: '주소관리명', field: 'CELLNM', width: 200, headerHozAlign: 'center', hozAlign: 'left'},
    { title: '국사코드', field: 'OFFICECD', width: 80, headerHozAlign: 'center', hozAlign: 'center'},
    { title: '국사명', field: 'OFFICENM', width: 150, headerHozAlign: 'center', hozAlign: 'center'},
    { title: '국사명2', field: 'OFFICENM2', width: 100, headerHozAlign: 'center', hozAlign: 'center'},
    { title: 'Biz부', field: 'BIZ_LV2NM', width: 120, headerHozAlign: 'center', hozAlign: 'center'},
    { title: 'Biz팀', field: 'BIZ_LV3NM', width: 120, headerHozAlign: 'center', hozAlign: 'center'},
    { title: '선로본부', field: 'LINE_LV1NM', width: 80, headerHozAlign: 'center', hozAlign: 'center'},
    { title: '선로센터', field: 'LINE_LV2NM', width: 120, headerHozAlign: 'center', hozAlign: 'center'},
    { title: '선로부', field: 'LINE_LV3NM', width: 120, headerHozAlign: 'center', hozAlign: 'center'},
    { title: '선로팀', field: 'LINE_LV4NM', width: 120, headerHozAlign: 'center', hozAlign: 'center'},
    { title: '설계센터', field: 'DESIGN_LV2NM', width: 120, headerHozAlign: 'center', hozAlign: 'center'},
    { title: '설계팀', field: 'DESIGN_LV3NM', width: 120, headerHozAlign: 'center', hozAlign: 'center'},
  ];

  // 엑셀 저장 시 추가로 보여줄 엑셀 field 설정
  const [visibleColumns, setVisibleColumns] = useState(['applyTarget|N']);

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
      const params = { pDEBUG: "F"};
      let url = "OrgMngInfo/OfcCodeList";

      if(filters.selectgbn === 'OFCTOORG') {
        url = "OrgMngInfo/OfcCodeList";
      }
      else if (filters.selectgbn === 'ADDRTOOFC') {
        url = "OrgMngInfo/AddrInfoList";
      }
      else if (filters.selectgbn === 'ORGTOADDR') {
        url = "OrgMngInfo/OrgMappingList";
      }

      const response = await fetchData(url, params);

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
    } else if (eventType === 'showPopup') {
      fn_DetailPopup('');
    } else if (eventType === 'showOfcUploadPopup') {
      setOfcExcelPopupTitle('국사-조직정보 업로드');
      setShowOfcExcelPopup(true);
    } else if (eventType === 'showAddrUploadPopup') {
      setAddrExcelPopupTitle('주소-국사정보 업로드');
      setShowAddrExcelPopup(true);
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

  useEffect(() => {    
    if (isInitialRender.current || !tableInstance.current || tableStatus !== 'ready' || loading) return;
    const { filterSelect, filterValue } = tableFilters;
    
    setFilterTableFields((prevFields) => {
      return prevFields.map((filter) => {
        if (filter.id === 'filterSelect') {  
          return { ...filter };
        } else {
          return { ...filter, disabled: filterSelect !== '' ? '' : 'disabled', value: '' }; // 기본적으로 숨김 처리
        }
      });
    });
        
    if (filterValue && filterSelect) {
      tableInstance.current.setFilter(filterSelect, 'like', filterValue);
    } else {
      tableInstance.current.clearFilter();
    }
  }, [tableFilters.filterSelect, tableFilters.filterValue, tableStatus, loading]);

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
        onDownloadExcel={() => {handleDownloadExcel2(tableInstance.current, tableStatus, excelNm, visibleColumns)}}
        rowCount={rowCount}
        onEvent={handleDynamicEvent}
      >
        <div id='btnSave' className='btnGroupCustom'>
          <button className={`btn btn-primary ${styles.btn}`} onClick={handleSave}>
            저장
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
      <ExcelUploadPopup
        show={showOfcExcelPopup}
        onHide={() => setShowOfcExcelPopup(false)}
        onSave={(result) => {
          if (result.errCd === '00') {
            loadData(); // Refresh table on success
          }
          return result;
        }}
        title={ofcExcelPopupTitle}
        rptCd="OFCCODEEXCELUPLOAD"
        templateParams={{ pGUBUN: 'RPTCD', pTITLE: '', pFILEID: '10', pRPTCD: 'OFCCODEEXCELUPLOAD', pDEBUG: 'F' }}
      />
      <ExcelUploadPopup
          show={showAddrExcelPopup}
          onHide={() => setShowAddrExcelPopup(false)}
          onSave={(result) => {
            if (result.errCd === '00') {
              loadData(); // Refresh table on success
            }
            return result;
          }}
          title={addrExcelPopupTitle}
          rptCd="ADDRINFOEXCELUPLOAD"
          templateParams={{ pGUBUN: 'RPTCD', pTITLE: '', pFILEID: '11', pRPTCD: 'ADDRINFOEXCELUPLOAD', pDEBUG: 'F' }}
      />
      <CommonPopup
        show={showUserPopup}
        onHide={handleUserCancel}
        onConfirm={() => {}}
        title="사용자 선택"
      >
        <UserSearchPopup
          onClose={handleUserCancel}
          onConfirm={handleUserConfirm}
        />
      </CommonPopup>
    </div>
  );
};

export default OrgManageInfo;
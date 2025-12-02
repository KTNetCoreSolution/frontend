import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import ExcelUploadPopup from '../../components/popup/ExcelUploadPopup';
import RentalProductPopup from './popup/RentalProductPopup';
import RentalProductManagePopup from './popup/RentalProductManagePopup';
import UserOrgSearchPopup from '../../components/popup/UserOrgSearchPopup';
import CommonPopup from '../../components/popup/CommonPopup';
import { createGlobalStyle } from 'styled-components';

const GlobalStyles = createGlobalStyle`
  .tabulator-cell.bg-product-cell {
    background-color: #fbfbf4 !important;
  }

  .tabulator-cell.bg-user-cell {
    background-color: #f3fbff !important;
  }

  .tabulator-cell.bg-reg-cell {
    background-color: #eaeaea !important;
  }

  .tabulator-row.edited .tabulator-cell {
    background-color: #fff3cd !important;
  }
`;

const fn_CellNumber = { editor: 'number', editorParams: { min: 0 }, editable: true };
const fn_CellSelect = (values) => ({
  editor: 'list',
  editorParams: { values, autocomplete: true },
  editable: true
});

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

const RentalBatchManage = () => {
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
  const [excelPopupTitle, setExcelPopupTitle] = useState('');
  const [showExcelPopup, setShowExcelPopup] = useState(false);
  const [showProductPopup, setShowProductPopup] = useState(false);
  const [showProductManagePopup, setShowProductManagePopup] = useState(false);
  const [showUserPopup, setShowUserPopup] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showDeletePopup, setShowDeletePopup] = useState(false);

  const pGUBUN = useMemo(() => {
    if (showOrgPopup) {
      return 'OPEREMPNO';
    }
    return 'OPEREMPNO';
  }, [showOrgPopup]);

  const updatedClassOptions = useMemo(
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
          { id: 'popupBtn', type: 'button', row: 2, label: '상품관리', eventType: 'showProductManagePopup', width: '80px', height: '30px', backgroundColor: '#00c4b4', color: '#ffffff', enabled: true },
          { id: 'excelUploadBtn', type: 'button', row: 2, label: '엑셀업로드', eventType: 'showExcelUploadPopup', width: '100px', height: '30px', backgroundColor: '#00c4b4', color: '#ffffff', enabled: true },
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

  const handleCellEdited = (cell) => {
    const field   = cell.getField();
    const newVal  = cell.getValue();
    const oldVal  = cell.getOldValue();
    const rowEl   = cell.getRow().getElement();

    // ---------- 날짜 컬럼 ----------
    if (field === 'CONTRACT_STARTDT' || field === 'CONTRACT_ENDDT') {
      // 1. 빈값 입력 → 기존값 복원 + 노란 배경 제거
      if (!newVal || newVal === '') {
        cell.setValue(oldVal);
        rowEl.classList.remove('edited');
        return;
      }

      // 2. 유효한 날짜인지 확인
      const date = new Date(newVal);
      if (isNaN(date)) {
        cell.setValue(oldVal);
        rowEl.classList.remove('edited');
        return;
      }

      // 3. 한국 시간 기준 YYYY-MM-DD 형식으로 변환
      const formatted = date.toISOString().split('T')[0];

      // 4. 값이 실제로 바뀌었는지 확인
      if (formatted === oldVal) {
        return; // 변경 없음 → 아무것도 안 함
      }

      // 5. 값 변경 → 형식 저장 + 노란 배경 추가
      cell.setValue(formatted);
      setTimeout(() => rowEl.classList.add('edited'), 0);
      return;
    }

    // ---------- 기타 텍스트/숫자 컬럼 ----------
    if (newVal === oldVal) {
      return; // 변경 없음 → 아무것도 안 함
    }

    // 변경 있음 → 노란 배경 추가
    setTimeout(() => rowEl.classList.add('edited'), 0);
  };

  const columns = [
    {
      frozen: true,
      headerHozAlign: "center",
      hozAlign: "center",
      title: "작업",
      field: "actions",
      width: 120,
      formatter: (cell) => {
        const rowData = cell.getData();
        const wrapper = document.createElement("div");
        wrapper.style.display = "flex";
        wrapper.style.justifyContent = "center";
        wrapper.style.alignItems = "center";
        wrapper.style.gap = "8px";
        const editButton = document.createElement("button");
        editButton.className = `btn btn-sm btn-primary`;
        editButton.innerText = "변경";
        editButton.setAttribute("data-action", "edit");
        editButton.onclick = () => {
          setSelectedRow(rowData);
          setShowEditPopup(true);
        };
        wrapper.appendChild(editButton);

        const deleteButton = document.createElement("button");
        deleteButton.className = `btn btn-sm btn-danger`;
        deleteButton.innerText = "삭제";
        deleteButton.setAttribute("data-action", "delete");
        deleteButton.onclick = () => {
          setSelectedRow(rowData);
          setShowDeletePopup(true);
        };
        wrapper.appendChild(deleteButton);
        return wrapper;
      },
      editable: false
    },
    { headerHozAlign: 'center', hozAlign: 'center', title: '순번', field: 'ID', sorter: 'string', width: 80, frozen: true, editable: false },
    { headerHozAlign: 'center', hozAlign: 'center', title: '등록일', field: 'DDATE', sorter: 'string', width: 100, frozen: true, editable: false, cssClass: 'bg-reg-cell' },
    { headerHozAlign: 'center', hozAlign: 'center', title: '계약번호', field: 'CONTRACT_NUM', sorter: 'string', width: 120, frozen: true, editor: 'input', editable: true, cellEdited: handleCellEdited },
    { headerHozAlign: 'center', hozAlign: 'center', title: '계약시작일', field: 'CONTRACT_STARTDT', sorter: 'string', width: 100, editor: 'date', editable: true, cellEdited: handleCellEdited },
    { headerHozAlign: 'center', hozAlign: 'center', title: '계약종료일', field: 'CONTRACT_ENDDT', sorter: 'string', width: 100, editor: 'date', editable: true, cellEdited: handleCellEdited },
    { headerHozAlign: 'center', hozAlign: 'right', title: '임차가(월)', field: 'MRENT_PRICE', sorter: 'string', width: 120, editor: 'number', editable: true, cellEdited: handleCellEdited },
    { headerHozAlign: 'center', hozAlign: 'center', title: '자산번호', field: 'ASSET_NUM', sorter: 'string', width: 120, editor: 'input', editable: true, cellEdited: handleCellEdited },
    { headerHozAlign: 'center', hozAlign: 'center', title: '용도', field: 'PURPOSE', sorter: 'string', width: 120, editor: 'input', editable: true, cellEdited: handleCellEdited },
    { headerHozAlign: 'center', hozAlign: 'center', title: '지급구분', field: 'PAYGB', sorter: 'string', width: 120, editor: 'input', editable: true, cellEdited: handleCellEdited },
    { headerHozAlign: 'center', hozAlign: 'center', title: '분류', field: 'CLASSNM', sorter: 'string', width: 100, editable: false, cellClick: (e, cell) => {setSelectedRow(cell.getData());setShowProductPopup(true);}, cssClass: 'bg-product-cell' },
    { headerHozAlign: 'center', hozAlign: 'center', title: '상품명', field: 'PRODUCTNM', sorter: 'string', width: 150, editable: false, cellClick: (e, cell) => {setSelectedRow(cell.getData());setShowProductPopup(true);}, cssClass: 'bg-product-cell' },
    { headerHozAlign: 'center', hozAlign: 'center', title: '모델명', field: 'MODELNM', sorter: 'string', width: 400, editable: false, cellClick: (e, cell) => {setSelectedRow(cell.getData());setShowProductPopup(true);}, cssClass: 'bg-product-cell' },
    { headerHozAlign: 'center', hozAlign: 'center', title: '시리얼번호', field: 'SN', sorter: 'string', width: 150, editor: 'input', editable: true, cellEdited: handleCellEdited },
    { headerHozAlign: 'center', hozAlign: 'center', title: '업무분야', field: 'SECTIONNM', sorter: 'string', width: 80, editable: false, cellClick: (e, cell) => {setSelectedRow(cell.getData());setShowUserPopup(true);}, cssClass: 'bg-user-cell' },
    { headerHozAlign: 'center', hozAlign: 'center', title: '조직1', field: 'ORGNM1', sorter: 'string', width: 130, editable: false, cellClick: (e, cell) => {setSelectedRow(cell.getData());setShowUserPopup(true);}, cssClass: 'bg-user-cell' },
    { headerHozAlign: 'center', hozAlign: 'center', title: '조직2', field: 'ORGNM2', sorter: 'string', width: 130, editable: false, cellClick: (e, cell) => {setSelectedRow(cell.getData());setShowUserPopup(true);}, cssClass: 'bg-user-cell' },
    { headerHozAlign: 'center', hozAlign: 'center', title: '조직3', field: 'ORGNM3', sorter: 'string', width: 130, editable: false, cellClick: (e, cell) => {setSelectedRow(cell.getData());setShowUserPopup(true);}, cssClass: 'bg-user-cell' },
    { headerHozAlign: 'center', hozAlign: 'center', title: '조직4', field: 'ORGNM4', sorter: 'string', width: 130, editable: false, cellClick: (e, cell) => {setSelectedRow(cell.getData());setShowUserPopup(true);}, cssClass: 'bg-user-cell' },
    { headerHozAlign: 'center', hozAlign: 'center', title: '담당자사번', field: 'EMPNO', sorter: 'string', width: 100, editable: false, cellClick: (e, cell) => {setSelectedRow(cell.getData());setShowUserPopup(true);}, cssClass: 'bg-user-cell' },
    { headerHozAlign: 'center', hozAlign: 'center', title: '담당자', field: 'EMPNM', sorter: 'string', width: 100, editable: false, cellClick: (e, cell) => {setSelectedRow(cell.getData());setShowUserPopup(true);}, cssClass: 'bg-user-cell' },
    { headerHozAlign: 'center', hozAlign: 'left', title: '주소지', field: 'ADDR', sorter: 'string', width: 350, editor: 'input', editable: true, cellEdited: handleCellEdited },
    { headerHozAlign: 'center', hozAlign: 'left', title: '비고', field: 'MEMO', sorter: 'string', width: 300, editor: 'input', editable: true, cellEdited: handleCellEdited },
    { headerHozAlign: 'center', hozAlign: 'center', title: '등록자사번', field: 'REG_EMPNO', sorter: 'string', width: 100, editable: false, cssClass: 'bg-reg-cell' },
    { headerHozAlign: 'center', hozAlign: 'center', title: '등록자', field: 'REG_EMPNM', sorter: 'string', width: 100, editable: false, cssClass: 'bg-reg-cell' },
    { headerHozAlign: 'center', hozAlign: 'center', title: '계약번호(원본)', field: 'ORGIN_CONTRACT_NUM', sorter: 'string', width: 100, visible: false, editable: false },
    { headerHozAlign: 'center', hozAlign: 'center', title: '시리얼번호(원본)', field: 'ORGIN_SN', sorter: 'string', width: 100, visible: false, editable: false },
  ];

  const loadData = async () => {
    setLoading(true);
    setIsSearched(true);

    try {
      const params = {
        pGUBUN: 'LIST',
        pEMPNO: user?.empNo || '',
        pORGCD: filters.ORGCD || 'ALL',
        pCLASSCD: filters.CLASSCD === 'all' ? '' : filters.CLASSCD,
        pDATEGUBUN: filters.dayGubun,
        pDATE1: filters.dayGubun === 'D' ? filters.rangeStartDate : filters.dayGubun === 'M' ? filters.monthDate : '',
        pDATE2: filters.dayGubun === 'D' ? filters.rangeEndDate : filters.dayGubun === 'M' ? filters.monthDate : '',
        pDEBUG: 'F',
      };

      const response = await fetchData('rental/batchMng/list', params);
      if (!response.success) {
        errorMsgPopup(response.message || '데이터를 가져오는 중 오류가 발생했습니다.');
        setData([]);
        return;
      }
      const responseData = Array.isArray(response.data) ? response.data : [];
      setData(responseData); // ID 필드가 이미 서버 데이터에 포함되어 있음
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
          index: 'ID', // 테이블 인덱스를 ID로 설정
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
    } else if (eventType === 'showProductManagePopup') {
      setShowProductManagePopup(true);
    } else if (eventType === 'showExcelUploadPopup') {
      setExcelPopupTitle('일괄등록');
      setShowExcelPopup(true);
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

  const handleProductSelect = (rowData) => {
    if (!selectedRow || !tableInstance.current) return;

    const table = tableInstance.current;
    const row   = table.getRow(selectedRow.ID);
    if (!row) return;

    const newRow = {
      ...selectedRow,
      CLASSCD:    rowData.CLASSCD,
      CLASSNM:    rowData.CLASSNM,
      PRODUCTCD:  rowData.PRODUCTCD,
      PRODUCTNM:  rowData.PRODUCTNM,
      MODELNM:    rowData.MODELNM,
    };

    table.updateRow(selectedRow.ID, newRow);

    setTimeout(() => {
      const el = row.getElement();
      el.classList.add('edited');
    }, 0);

    setShowProductPopup(false);
    setSelectedRow(null);
  };

  const handleUserSelect = (rowDataArray) => {
    if (!selectedRow || !tableInstance.current || !rowDataArray?.length) {
      setShowUserPopup(false);
      setSelectedRow(null);
      return;
    }

    const table = tableInstance.current;
    const row   = table.getRow(selectedRow.ID);
    if (!row) return;

    const sel = rowDataArray[0];
    const newRow = {
      ...selectedRow,
      SECTIONNM: sel.SECTIONNM || '',
      ORGNM1:    sel.ORGNM1    || '',
      ORGNM2:    sel.ORGNM2    || '',
      ORGNM3:    sel.ORGNM3    || '',
      ORGNM4:    sel.ORGNM4    || '',
      EMPNO:     sel.EMPNO     || '',
      EMPNM:     sel.EMPNM     || '',
    };

    table.updateRow(selectedRow.ID, newRow);

    setTimeout(() => {
      const el = row.getElement();
      el.classList.add('edited');
    }, 0);

    setShowUserPopup(false);
    setSelectedRow(null);
  };

  const handleProductManageSave = () => {
    fetchBizMCodeOptions();
    // setShowProductManagePopup(false);
  };

  const handleEditConfirm = async () => {
    if (!selectedRow) return;

    if (!selectedRow.CONTRACT_NUM?.trim()) {
      errorMsgPopup("계약번호는 필수 입력 항목입니다.");
      setShowEditPopup(false);
      return;
    }

    if (!selectedRow.SN?.trim()) {
      errorMsgPopup("시리얼번호는 필수 입력 항목입니다.");
      setShowEditPopup(false);
      return;
    }

    const validations = [
      { value: selectedRow.CONTRACT_NUM, maxLength: 20, label: "계약번호" },
      { value: selectedRow.CONTRACT_STARTDT, maxLength: 10, label: "계약시작일" },
      { value: selectedRow.CONTRACT_ENDDT, maxLength: 10, label: "계약종료일" },
      { value: selectedRow.MRENT_PRICE, maxLength: 10, label: "임차가(월)", isNumber: true },
      { value: selectedRow.ASSET_NUM, maxLength: 20, label: "자산번호" },
      { value: selectedRow.PURPOSE, maxLength: 100, label: "용도" },
      { value: selectedRow.PAYGB, maxLength: 100, label: "지급구분" },
      { value: selectedRow.SN, maxLength: 40, label: "시리얼번호", isNumber: true },
      { value: selectedRow.ADDR, maxLength: 500, label: "주소지" },
      { value: selectedRow.MEMO, maxLength: 500, label: "비고" },
    ];

    for (const validation of validations) {
      if (validation.value !== undefined && validation.value !== null) {
        const valueToCheck = validation.isNumber ? String(validation.value) : validation.value;
        const result = common.validateVarcharLength(valueToCheck, validation.maxLength, validation.label);
        if (!result.valid) {
          errorMsgPopup(result.error);
          setShowEditPopup(false);
          return;
        }
      }
    }

    setShowEditPopup(false);
    try {
      const params = {
        pGUBUN: 'U',
        pDATE1: '',
        pDATE2: '',
        pEMPNO: selectedRow.EMPNO || '',
        pORGIN_CONTRACT_NUM: selectedRow.ORGIN_CONTRACT_NUM || '',
        pORGIN_SN: selectedRow.ORGIN_SN || '',
        pCONTRACT_NUM: selectedRow.CONTRACT_NUM || '',
        pCONTRACT_STARTDT: selectedRow.CONTRACT_STARTDT || '',
        pCONTRACT_STARTTM: selectedRow.CONTRACT_STARTTM || '',
        pCONTRACT_ENDDT: selectedRow.CONTRACT_ENDDT || '',
        pCONTRACT_ENDTM: selectedRow.CONTRACT_ENDTM || '',
        pMRENT_PRICE: selectedRow.MRENT_PRICE || '',
        pASSET_NUM: selectedRow.ASSET_NUM || '',
        pPURPOSE: selectedRow.PURPOSE || '',
        pPAYGB: selectedRow.PAYGB || '',
        pPRODUCTCD: selectedRow.PRODUCTCD || '',
        pSN: selectedRow.SN || '',
        pZIPCODE: selectedRow.ZIPCODE || '',
        pADDR: selectedRow.ADDR || '',
        pMEMO: selectedRow.MEMO || '',
        pREG_EMPNO: user?.empNo || '',
      };

      const response = await fetchData('rental/batchMng/save', params);
      if (!response.success) {
        errorMsgPopup(response.message || '변경 중 오류가 발생했습니다.');
        return;
      }
      if (response.errMsg !== '' || (response.data[0] && response.data[0].errCd !== '00')) {
        let errMsg = response.errMsg;
        if (response.data[0] && response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;
        msgPopup(errMsg);
        return;
      }
      msgPopup('변경되었습니다.');
      loadData();
    } catch (err) {
      console.error('변경 실패:', err);
      errorMsgPopup('변경 중 오류가 발생했습니다.');
    } finally {
      setSelectedRow(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedRow) return;
    setShowDeletePopup(false);
    try {
      const params = {
        pGUBUN: 'D',
        pDATE1: '',
        pDATE2: '',
        pEMPNO: user?.empNo || '',
        pORGIN_CONTRACT_NUM: selectedRow.ORGIN_CONTRACT_NUM || '',
        pORGIN_SN: selectedRow.ORGIN_SN || '',
        pCONTRACT_NUM: selectedRow.CONTRACT_NUM || '',
        pCONTRACT_STARTDT: selectedRow.CONTRACT_STARTDT || '',
        pCONTRACT_STARTTM: selectedRow.CONTRACT_STARTTM || '',
        pCONTRACT_ENDDT: selectedRow.CONTRACT_ENDDT || '',
        pCONTRACT_ENDTM: selectedRow.CONTRACT_ENDTM || '',
        pMRENT_PRICE: selectedRow.MRENT_PRICE || '',
        pASSET_NUM: selectedRow.ASSET_NUM || '',
        pPURPOSE: selectedRow.PURPOSE || '',
        pPAYGB: selectedRow.PAYGB || '',
        pPRODUCTCD: selectedRow.PRODUCTCD || '',
        pSN: selectedRow.SN || '',
        pZIPCODE: selectedRow.ZIPCODE || '',
        pADDR: selectedRow.ADDR || '',
        pMEMO: selectedRow.MEMO || '',
        pREG_EMPNO: selectedRow.REG_EMPNO || user?.empNo || '',
      };
      const response = await fetchData('rental/batchMng/save', params);
      if (!response.success) {
        errorMsgPopup(response.message || '삭제 중 오류가 발생했습니다.');
        return;
      }
      if (response.errMsg !== '' || (response.data[0] && response.data[0].errCd !== '00')) {
        let errMsg = response.errMsg;
        if (response.data[0] && response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;
        msgPopup(errMsg);
        return;
      }
      msgPopup('삭제되었습니다.');
      loadData();
    } catch (err) {
      console.error('삭제 실패:', err);
      errorMsgPopup('삭제 중 오류가 발생했습니다.');
    } finally {
      setSelectedRow(null);
    }
  };

  if (user === null) {
    return <div>사용자 정보 로드 중...</div>;
  }

  return (
    <div className='container'>
      <GlobalStyles />
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
        onDownloadExcel={() => handleDownloadExcel(tableInstance.current, tableStatus, '렌탈일괄관리.xlsx')}
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
      <ExcelUploadPopup
        show={showExcelPopup}
        onHide={() => setShowExcelPopup(false)}
        onSave={(result) => {
          if (result.errCd === '00') {
            loadData();
          }
          return result;
        }}
        title={excelPopupTitle}
        rptCd="RENTALINFOEXCELUPLOAD|Y"
        templateParams={{ pGUBUN: 'RPTCD', pTITLE: '', pFILEID: '', pRPTCD: 'RENTALINFOEXCELUPLOAD', pDEBUG: 'F' }}
      />
      <RentalProductPopup show={showProductPopup} onHide={() => setShowProductPopup(false)} data={classData} onSave={handleProductSelect} />
      <UserOrgSearchPopup show={showUserPopup} onHide={() => setShowUserPopup(false)} onSave={handleUserSelect} />
      <RentalProductManagePopup show={showProductManagePopup} onHide={() => setShowProductManagePopup(false)} data={classData} onSave={handleProductManageSave} />
      <CommonPopup
        show={showEditPopup}
        onHide={() => { setShowEditPopup(false); setSelectedRow(null); }}
        onConfirm={handleEditConfirm}
        title="변경 확인"
      >
        <p className='commonInnerTxt'>{selectedRow?.CONTRACT_NUM ? `${selectedRow.CONTRACT_NUM} 변경하시겠습니까?` : "변경하시겠습니까?"}</p>
      </CommonPopup>
      <CommonPopup
        show={showDeletePopup}
        onHide={() => { setShowDeletePopup(false); setSelectedRow(null); }}
        onConfirm={handleDeleteConfirm}
        title="삭제 확인"
      >
        <p className='commonInnerTxt'>{selectedRow?.CONTRACT_NUM ? `${selectedRow.CONTRACT_NUM} 삭제하시겠습니까?` : "삭제하시겠습니까?"}</p>
      </CommonPopup>
    </div>
  );
};

export default RentalBatchManage;
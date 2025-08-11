import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../../store/store';
import { hasPermission } from '../../utils/authUtils';
import StandardClassSelectPopup from './popup/StandardClassSelectPopup';
import MainSearch from '../../components/main/MainSearch';
import TableSearch from '../../components/table/TableSearch';
import { createTable } from '../../utils/tableConfig';
import { initialFilters } from '../../utils/tableEvent';
import { handleDownloadExcel } from '../../utils/tableExcel';
import { fetchData } from '../../utils/dataUtils';
import StandardEmpJobRegPopup from './popup/StandardEmpJobRegPopup';
import styles from '../../components/table/TableSearch.module.css';
import { errorMsgPopup } from '../../utils/errorMsgPopup';

const fn_CellNumber = { editor: 'number', editorParams: { min: 0 }, editable: true };
const fn_CellSelect = (values) => ({ editor: 'list', editorParams: { values, autocomplete: true }, editable: true });

const fn_HandleCellEdit = (cell, field, setData, tableInstance) => {
  const rowId = cell.getRow().getData().ID;
  const newValue = cell.getValue();
  setTimeout(() => {
    setData((prevData) =>
      prevData.map((row) => {
        if (String(row.ID) === String(rowId)) {
          const updatedRow = { ...row, [field]: newValue };
          if (updatedRow.isDeleted === 'N' && updatedRow.isAdded === 'N') {
            updatedRow.isChanged = 'Y';
          }
          return updatedRow;
        }
        return row;
      })
    );
    if (tableInstance.current) tableInstance.current.redraw();
  }, 0);
};

// getFieldOptions 함수
const getFieldOptions = (fieldId, dependentValue = '', classData) => {
  if (!Array.isArray(classData)) return [];

  const uniqueMap = new Map();

  if (fieldId === 'CLASSACD') {
    classData.forEach((item) => {
      if (item.CLASSACD && item.CLASSANM && !uniqueMap.has(item.CLASSACD)) {
        uniqueMap.set(item.CLASSACD, { value: item.CLASSACD, label: item.CLASSANM });
      }
    });
    return [{ value: 'all', label: '==대분류==' }, ...Array.from(uniqueMap.values())];
  }

  if (fieldId === 'CLASSBCD') {
    if (!dependentValue || dependentValue === 'all') {
      return [{ value: 'all', label: '==중분류==' }];
    }
    classData
      .filter((item) => item.CLASSACD === dependentValue)
      .forEach((item) => {
        if (item.CLASSBCD && item.CLASSBNM && !uniqueMap.has(item.CLASSBCD)) {
          uniqueMap.set(item.CLASSBCD, { value: item.CLASSBCD, label: item.CLASSBNM });
        }
      });
    return [{ value: 'all', label: '==중분류==' }, ...Array.from(uniqueMap.values())];
  }

  if (fieldId === 'CLASSCCD') {
    if (!dependentValue || dependentValue === 'all') {
      return [{ value: 'all', label: '==소분류==' }];
    }
    classData
      .filter((item) => item.CLASSBCD === dependentValue)
      .forEach((item) => {
        if (item.CLASSCCD && item.CLASSCNM && !uniqueMap.has(item.CLASSCCD)) {
          uniqueMap.set(item.CLASSCCD, { value: item.CLASSCCD, label: item.CLASSCNM });
        }
      });
    return [{ value: 'all', label: '==소분류==' }, ...Array.from(uniqueMap.values())];
  }

  if (fieldId === 'WORKTYPE') {
    return [
      { value: '', label: '선택' },
      { value: '정규', label: '정규' },
      { value: '계약', label: '계약' },
      { value: '파견', label: '파견' },
      { value: '일근', label: '일근' },
    ];
  }

  if (fieldId === 'filterSelect') {
    return [
      { value: '', label: '선택' },
      { value: 'CLASSANM', label: '대분류' },
      { value: 'CLASSBNM', label: '중분류' },
      { value: 'CLASSCNM', label: '소분류' },
      { value: 'NAME', label: '이름' },
      { value: 'WORKTYPE', label: '근무형태' },
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
  { id: 'filterSelect', type: 'select', label: '', options: getFieldOptions('filterSelect', '', []), width: '150px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true },
  { id: 'filterText', type: 'text', label: '', placeholder: '찾을 내용을 입력하세요', width: '200px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true },
];

const StandardEmpJobManage = () => {
  const { user } = useStore();
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  const [showClassPopup, setShowClassPopup] = useState(false);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [_class1Options, setClass1Options] = useState([]);
  const [_class2Options, setClass2Options] = useState([]);
  const [_class3Options, setClass3Options] = useState([]);
  const [classData, setClassData] = useState([]);
  const [filters, setFilters] = useState({ CLASSACD: '', CLASSBCD: '', CLASSCCD: '', dayGubun: 'M', classGubun: 'LINE', classGubunTxt: '선로' });
  const [tableFilters, setTableFilters] = useState({});
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [isSearched, setIsSearched] = useState(false);
  const [tableStatus, setTableStatus] = useState('initializing');
  const [rowCount, setRowCount] = useState(0);
  const tableRef = useRef(null);
  const tableInstance = useRef(null);
  const isInitialRender = useRef(true);

  // useMemo로 옵션 최적화
  const updatedClass2Options = useMemo(
    () => getFieldOptions('CLASSBCD', filters.CLASSACD, classData),
    [filters.CLASSACD, classData]
  );
  const updatedClass3Options = useMemo(
    () => getFieldOptions('CLASSCCD', filters.CLASSBCD, classData),
    [filters.CLASSBCD, classData]
  );

  // 초기 searchConfig 설정
  const baseSearchConfig = {
    areas: [
      {
        type: 'search',
        fields: [
          { id: 'classGubunLbl', type: 'label', row: 1, label: '분야', labelVisible: false, width: '25px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true },
          ...(
            hasPermission(user?.auth, 'oper')
              ? [{ id: 'classGubun', type: 'select', row: 1, label: '분야', labelVisible: false, options: [{ value: 'LINE', label: '선로' }, { value: 'DESIGN', label: '설계' }, { value: 'BIZ', label: 'BIZ' }], defaultValue: 'LINE', width: '60px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true }]
              : user?.standardSectionCd === 'LINE'
                ? [{ id: 'classGubunTxt', type: 'text', row: 1, label: '분야', defaultValue: '선로', labelVisible: false, width: '60px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true }]
                : user?.standardSectionCd === 'DESIGN'
                  ? [{ id: 'classGubunTxt', type: 'text', row: 1, label: '분야', defaultValue: '설계', labelVisible: false, width: '60px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true }]
                  : user?.standardSectionCd === 'BIZ'
                    ? [{ id: 'classGubunTxt', type: 'text', row: 1, label: '분야', defaultValue: 'BIZ', labelVisible: false, width: '60px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true }]
                    : []
          ),
          { id: 'selectBtn', type: 'button', label: '선택', labelVisible: false, eventType: 'showClassPopup', width: '60px', height: '30px', backgroundColor: '#00c4b4', color: '#ffffff', enabled: true }, // 분류 선택 버튼
          { id: 'CLASSACD', type: 'select', row: 1, label: '대분류', labelVisible: true, options: [], width: '150px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true }, // 대분류 드롭다운
          { id: 'CLASSBCD', type: 'select', row: 1, label: '중분류', labelVisible: true, options: [], width: '150px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true }, // 중분류 드롭다운
          { id: 'CLASSCCD', type: 'select', row: 1, label: '소분류', labelVisible: true, options: [], width: '250px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true }, // 소분류 드롭다운
          { id: 'dayGubunLbl', type: 'label', row: 2, label: '작업', labelVisible: false, width: '25px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true }, // 작업 라벨
          { id: 'dayGubun', type: 'select', row: 2, label: '', labelVisible: false, options: [{ value: 'M', label: '월' }, { value: 'D', label: '일' }], defaultValue: 'M', width: '50px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true }, // 월/일 선택 드롭다운
          { id: 'monthDate', type: 'month', row: 2, label: '', labelVisible: true, placeholder: '월 선택', width: '100px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: false, defaultValue: today }, // 월 선택 입력 (dayGubun: 'M'일 때 표시)
          { id: 'rangeStartDate', type: 'startday', row: 2, label: '', labelVisible: true, placeholder: '시작일 선택', width: '120px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: false, defaultValue: today }, // 시작일 입력 (dayGubun: 'D'일 때 표시)
          { id: 'rangeEndDate', type: 'endday', row: 2, label: ' ~ ', labelVisible: true, placeholder: '종료일 선택', width: '120px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: false, defaultValue: today }, // 종료일 입력 (dayGubun: 'D'일 때 표시)
        ],
      },
      {
        type: 'buttons',
        fields: [
          { id: 'addBtn', type: 'button', row: 1, label: '개별업무', eventType: 'showAddPopup', width: '100px', height: '30px', backgroundColor: '#00c4b4', color: '#ffffff', enabled: true }, // 개별업무 추가 버튼
          { id: 'searchBtn', type: 'button', row: 1, label: '검색', eventType: 'search', width: '80px', height: '30px', backgroundColor: '#00c4b4', color: '#ffffff', enabled: true }, // 검색 버튼
        ],
      },
    ],
  };

  // 동적 searchConfig: dayGubun 값에 따라 monthDate 또는 rangeStartDate/rangeEndDate 표시
  const [searchConfig, setSearchConfig] = useState(baseSearchConfig);

  useEffect(() => {
    setSearchConfig((prev) => {
      const newAreas = prev.areas.map((area) => {
        if (area.type !== 'search') return area;
        const baseFields = baseSearchConfig.areas.find((a) => a.type === 'search').fields;
        const currentFields = prev.areas.find((a) => a.type === 'search').fields;
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
            const currentField = currentFields.find((f) => f.id === field.id);
            if (['CLASSACD', 'CLASSBCD', 'CLASSCCD'].includes(field.id) && currentField?.options) {
              return { ...field, options: currentField.options };
            }
            return field;
          });
        return { ...area, fields: newFields };
      });
      return { ...prev, areas: newAreas };
    });
  }, [filters.dayGubun]);

  // classData API 호출
  useEffect(() => {
    const fetchClassData = async () => {
      if (!filters.classGubun) return; // 빈 값이면 호출하지 않음
      try {
        const params = {
          pGUBUN:
            hasPermission(user?.auth, 'oper')
              ? filters.classGubun
              : user?.standardSectionCd === 'LINE'
                ? 'LINE'
                : user?.standardSectionCd === 'DESIGN'
                  ? 'DESIGN'
                  : user?.standardSectionCd === 'BIZ'
                    ? 'BIZ'
                    : 'LINE',
          pDEBUG: 'F',
        };

        const response = await fetchData('standard/classinfoList', params);
        if (!response.success) {
          errorMsgPopup(response.message || '분류 목록을 가져오는 중 오류가 발생했습니다.');
          return;
        }
        const fetchedClassData = Array.isArray(response.data) ? response.data : [];
        setClassData(fetchedClassData);

        const initialClass1Options = getFieldOptions('CLASSACD', '', fetchedClassData);
        const initialClass2Options = getFieldOptions('CLASSBCD', '', fetchedClassData);
        const initialClass3Options = getFieldOptions('CLASSCCD', '', fetchedClassData);

        setClass1Options(initialClass1Options);
        setClass2Options(initialClass2Options);
        setClass3Options(initialClass3Options);

        setSearchConfig((prev) => {
          const newAreas = prev.areas.map((area) => {
            if (area.type !== 'search') return area;
            const newFields = area.fields.map((field) => {
              if (field.id === 'CLASSACD') return { ...field, options: initialClass1Options };
              if (field.id === 'CLASSBCD') return { ...field, options: initialClass2Options };
              if (field.id === 'CLASSCCD') return { ...field, options: initialClass3Options };
              return field;
            });
            return { ...area, fields: newFields };
          });
          return { ...prev, areas: newAreas };
        });

        // 초기 filters 설정
        setFilters((prev) => ({
          ...prev,
          CLASSACD: prev.CLASSACD || 'all',
          CLASSBCD: prev.CLASSBCD || 'all',
          CLASSCCD: prev.CLASSCCD || 'all',
        }));
      } catch (err) {
        console.error('분류 목록 로드 실패:', err);
        errorMsgPopup(err.response?.data?.message || '분류 목록을 가져오는 중 오류가 발생했습니다.');
      }
    };
    fetchClassData();
  }, [filters.classGubun]);

  // filters 초기화, CLASSACD, CLASSBCD, CLASSCCD, dayGubun, monthDate 초기값 설정
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
      const initialFilters = {
        ...prev,
        ...dateFilters,
        CLASSACD: prev.CLASSACD || '',
        CLASSBCD: prev.CLASSBCD || '',
        CLASSCCD: prev.CLASSCCD || '',
        dayGubun: prev.dayGubun || 'M', // 초기 렌더링 시에만 'M' 설정, 이후 기존 값 유지
        monthDate: prev.monthDate || today.substring(0, 7), // monthDate 초기값 설정
      };
      return initialFilters;
    });
  }, [searchConfig, today]);

  useEffect(() => {
    setTableFilters(initialFilters(filterTableFields));
  }, []);

  // useEffect에서 filters.CLASSACD, filters.CLASSBCD 변경 시 options 및 searchConfig 업데이트
  useEffect(() => {
    setClass2Options(updatedClass2Options);
    setClass3Options(updatedClass3Options);

    setSearchConfig((prev) => {
      const prevClass2Options = prev.areas
        .find((area) => area.type === 'search')
        .fields.find((field) => field.id === 'CLASSBCD').options;
      const prevClass3Options = prev.areas
        .find((area) => area.type === 'search')
        .fields.find((field) => field.id === 'CLASSCCD').options;

      const isClass2OptionsChanged = JSON.stringify(prevClass2Options) !== JSON.stringify(updatedClass2Options);
      const isClass3OptionsChanged = JSON.stringify(prevClass3Options) !== JSON.stringify(updatedClass3Options);

      if (!isClass2OptionsChanged && !isClass3OptionsChanged) return prev;

      const newAreas = prev.areas.map((area) => {
        if (area.type !== 'search') return area;
        const newFields = area.fields.map((field) => {
          if (field.id === 'CLASSBCD' && isClass2OptionsChanged) return { ...field, options: updatedClass2Options };
          if (field.id === 'CLASSCCD' && isClass3OptionsChanged) return { ...field, options: updatedClass3Options };
          return field;
        });
        return { ...area, fields: newFields };
      });
      return { ...prev, areas: newAreas };
    });
  }, [filters.CLASSACD, filters.CLASSBCD, updatedClass2Options, updatedClass3Options, classData]);

  const columns = [
    { headerHozAlign: 'center', hozAlign: 'center', title: 'No', field: 'ID', sorter: 'number', width: 80 },
    { headerHozAlign: 'center', hozAlign: 'left', title: '대분류', field: 'CLASSANM', sorter: 'string', width: 150 },
    { headerHozAlign: 'center', hozAlign: 'left', title: '중분류', field: 'CLASSBNM', sorter: 'string', width: 150 },
    { headerHozAlign: 'center', hozAlign: 'left', title: '소분류', field: 'CLASSCNM', sorter: 'string', width: 250 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '이름', field: 'NAME', sorter: 'string', width: 100 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '근무형태', field: 'WORKTYPE', sorter: 'string', width: 100, ...fn_CellSelect(getFieldOptions('WORKTYPE', '', classData).map((item) => item.value)), cellEdited: (cell) => fn_HandleCellEdit(cell, 'WORKTYPE', setData, tableInstance) },
    { headerHozAlign: 'center', hozAlign: 'center', title: '작업일시', field: 'WORKDATETIME', sorter: 'string', width: 180, formatter: (cell) => `${cell.getData().WORKDATE} ${cell.getData().STARTTIME} ~ ${cell.getData().ENDTIME}` },
    { headerHozAlign: 'center', hozAlign: 'center', title: '작업시간', field: 'WORKHOURS', sorter: 'number', width: 100, ...fn_CellNumber, cellEdited: (cell) => fn_HandleCellEdit(cell, 'WORKHOURS', setData, tableInstance) },
    { headerHozAlign: 'center', hozAlign: 'center', title: '건(구간/본/개소)', field: 'QUANTITY', sorter: 'number', width: 150, ...fn_CellNumber, cellEdited: (cell) => fn_HandleCellEdit(cell, 'QUANTITY', setData, tableInstance) },
  ];

  const loadData = async () => {
    setLoading(true);
    setIsSearched(true);
    try {
      const params = {
        pGUBUN: filters.classGubun,
        pDEBUG: 'F',
        pCLASSACD: filters.CLASSACD === 'all' ? '' : filters.CLASSACD,
        pCLASSBCD: filters.CLASSBCD === 'all' ? '' : filters.CLASSBCD,
        pCLASSCCD: filters.CLASSCCD === 'all' ? '' : filters.CLASSCCD,
        pDAYGUBUN: filters.dayGubun,
        pMONTHDATE: filters.dayGubun === 'M' ? filters.monthDate : '',
        pSTARTDATE: filters.dayGubun === 'D' ? filters.rangeStartDate : '',
        pENDDATE: filters.dayGubun === 'D' ? filters.rangeEndDate : '',
      };

      const response = await fetchData('standard/empjoblist', params);
      if (!response.success) {
        errorMsgPopup(response.message || '데이터를 가져오는 중 오류가 발생했습니다.');
        return;
      }
      const responseData = Array.isArray(response.data) ? response.data : [];

      const mappedData = responseData.map((row, index) => {
        const classInfo = classData.find(
          (item) =>
            item.CLASSACD === row.CLASSACD &&
            item.CLASSBCD === row.CLASSBCD &&
            item.CLASSCCD === row.CLASSCCD
        );
        return {
          ID: String(row.ID || index + 1),
          CLASSACD: row.CLASSACD || '',
          CLASSBCD: row.CLASSBCD || '',
          CLASSCCD: row.CLASSCCD || '',
          CLASSANM: classInfo ? classInfo.CLASSANM : '',
          CLASSBNM: classInfo ? classInfo.CLASSBNM : '',
          CLASSCNM: classInfo ? classInfo.CLASSCNM : '',
          NAME: row.NAME || `Employee ${index + 1}`,
          WORKTYPE: row.WORKTYPE || '',
          WORKDATE: row.WORKDATE || today,
          STARTTIME: row.STARTTIME || '09:00',
          ENDTIME: row.ENDTIME || '18:00',
          WORKHOURS: row.WORKHOURS || 8,
          QUANTITY: row.QUANTITY || 1,
          WORKDATETIME: `${row.WORKDATE || today} ${row.STARTTIME || '09:00'} ~ ${row.ENDTIME || '18:00'}`,
          isDeleted: 'N',
          isAdded: 'N',
          isChanged: 'N',
        };
      });

      const seen = new Set();
      const filteredData = mappedData.filter((row) => {
        const key = `${row.CLASSACD}-${row.CLASSBCD}-${row.CLASSCCD}-${row.NAME}-${row.WORKDATE}-${row.STARTTIME}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true; // 추가 필터링 조건이 필요하면 여기에 추가
      });

      setData(filteredData);
    } catch (err) {
      console.error('데이터 로드 실패:', err);
      errorMsgPopup('데이터를 가져오는 중 오류가 발생했습니다.');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
          rowFormatter: (row) => {
            const data = row.getData();
            const el = row.getElement();
            el.classList.remove(styles.deletedRow, styles.addedRow, styles.editedRow);
            if (data.isDeleted === 'Y') el.classList.add(styles.deletedRow);
            else if (data.isAdded === 'Y') el.classList.add(styles.addedRow);
            else if (data.isChanged === 'Y') el.classList.add(styles.editedRow);
          },
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
          { field: 'CLASSANM', type: 'like', value: filterText },
          { field: 'CLASSBNM', type: 'like', value: filterText },
          { field: 'CLASSCNM', type: 'like', value: filterText },
          { field: 'NAME', type: 'like', value: filterText },
          { field: 'WORKTYPE', type: 'like', value: filterText },
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
    } else if (eventType === 'showClassPopup') {
      setShowClassPopup(true);
    } else if (eventType === 'showAddPopup') {
      setShowAddPopup(true);
    } else if (eventType === 'selectChange') {
      const { id, value } = payload;
      setFilters((prev) => {
        const newFilters = { ...prev, [id]: value };
        if (id === 'CLASSACD') {
          newFilters.CLASSBCD = '';
          newFilters.CLASSCCD = '';
        } else if (id === 'CLASSBCD') {
          newFilters.CLASSCCD = '';
        } else if (id === 'dayGubun') {
          // dayGubun 변경 시 searchConfig 동적 업데이트 및 필드 초기화
          newFilters.monthDate = value === 'M' ? today.substring(0, 7) : '';
          newFilters.rangeStartDate = value === 'D' ? today : '';
          newFilters.rangeEndDate = value === 'D' ? today : '';
          setSearchConfig((prevConfig) => {
            const newAreas = prevConfig.areas.map((area) => {
              if (area.type !== 'search') return area;
              const baseFields = baseSearchConfig.areas.find((a) => a.type === 'search').fields;
              const currentFields = prevConfig.areas.find((a) => a.type === 'search').fields;
              const newFields = baseFields
                .filter((field) => {
                  if (value === 'M') {
                    return field.id !== 'rangeStartDate' && field.id !== 'rangeEndDate';
                  } else if (value === 'D') {
                    return field.id !== 'monthDate';
                  }
                  return true;
                })
                .map((field) => {
                  const currentField = currentFields.find((f) => f.id === field.id);
                  if (['CLASSACD', 'CLASSBCD', 'CLASSCCD'].includes(field.id) && currentField?.options) {
                    return { ...field, options: currentField.options };
                  }
                  return field;
                });
              return { ...area, fields: newFields };
            });
            return { ...prevConfig, areas: newAreas };
          });
        }
        return newFilters;
      });
    }
  };

  const handleClassSelect = ({ major, middle, minor }) => {
    setClass2Options(getFieldOptions('CLASSBCD', major, classData));
    setClass3Options(getFieldOptions('CLASSCCD', middle, classData));

    setFilters((prev) => ({
      ...prev,
      CLASSACD: major,
      CLASSBCD: middle,
      CLASSCCD: minor,
    }));

    setShowClassPopup(false);
  };

  const handleAddCancel = () => {
    setShowAddPopup(false);
  };

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
        rowCount={rowCount}
        onDownloadExcel={() => handleDownloadExcel(tableInstance.current, tableStatus, '개별업무관리.xlsx')}
        buttonStyles={styles}
      >
      </TableSearch>
      <div className={styles.tableWrapper}>
        {tableStatus === 'initializing' && <div>초기화 중...</div>}
        {loading && <div>로딩 중...</div>}
        <div ref={tableRef} className={styles.tableSection} style={{ visibility: loading || tableStatus !== 'ready' ? 'hidden' : 'visible' }} />
      </div>
      <StandardClassSelectPopup show={showClassPopup} onHide={() => setShowClassPopup(false)} onSelect={handleClassSelect} data={classData} />
      <StandardEmpJobRegPopup show={showAddPopup} onHide={handleAddCancel} filters={filters} data={classData} />
    </div>
  );
};

export default StandardEmpJobManage;
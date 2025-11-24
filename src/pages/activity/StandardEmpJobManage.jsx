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
import StandardBizEmpJobRegPopup from './popup/StandardBizEmpJobRegPopup';
import styles from '../../components/table/TableSearch.module.css';
import { errorMsgPopup } from '../../utils/errorMsgPopup';
import { msgPopup } from '../../utils/msgPopup';
import common from '../../utils/common';

const fn_CellNumber = { editor: 'number', editorParams: { min: 0 }, editable: true };

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

  if (fieldId === 'filterSelect') {
    return [
      { value: '', label: '선택' },
      { value: 'CLASSANM', label: '대분류' },
      { value: 'CLASSBNM', label: '중분류' },
      { value: 'CLASSCNM', label: '소분류' },
      { value: 'EMPNM', label: '이름' },
      { value: 'WORKNM', label: '근무형태' },
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
  const today = common.getTodayDate();
  const [showClassPopup, setShowClassPopup] = useState(false);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [_class1Options, setClass1Options] = useState([]);
  const [_class2Options, setClass2Options] = useState([]);
  const [_class3Options, setClass3Options] = useState([]);
  const [classData, setClassData] = useState([]);
  const [bizWorkTypes, setBizWorkTypes] = useState([]);
  const [filters, setFilters] = useState({ CLASSACD: '', CLASSBCD: '', CLASSCCD: '', dayGubun: 'M', classGubun: user?.standardSectionCd || 'LINE', classGubunTxt: user?.standardSectionCd === 'LINE' ? '선로' : user?.standardSectionCd === 'DESIGN' ? '설계' : user?.standardSectionCd === 'BIZ' ? 'BIZ' : '선로' });
  const [tableFilters, setTableFilters] = useState({});
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [isSearched, setIsSearched] = useState(false);
  const [tableStatus, setTableStatus] = useState('initializing');
  const [rowCount, setRowCount] = useState(0);
  const tableRef = useRef(null);
  const tableInstance = useRef(null);
  const isInitialRender = useRef(true);
  const [popupClassFilters, setPopupClassFilters] = useState({CLASSACD: '', CLASSBCD: '', CLASSCCD: ''});

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
          { id: 'classGubunLbl', type: 'label', row: 1, label: '분야', labelVisible: false, enabled: true },
          ...(
            hasPermission(user?.auth, 'standardOper')
              ? [{ id: 'classGubun', type: 'select', row: 1, label: '분야', labelVisible: false, options: [{ value: 'LINE', label: '선로' }, { value: 'DESIGN', label: '설계' }, { value: 'BIZ', label: 'BIZ' }], defaultValue: 'LINE', enabled: true, eventType: 'selectChange' }]
              : user?.standardSectionCd === 'LINE'
                ? [{ id: 'classGubunTxt', type: 'text', row: 1, label: '분야', defaultValue: '선로', labelVisible: false, enabled: true, width:'60px' }]
                : user?.standardSectionCd === 'DESIGN'
                  ? [{ id: 'classGubunTxt', type: 'text', row: 1, label: '분야', defaultValue: '설계', labelVisible: false, enabled: true, width:'60px' }]
                  : user?.standardSectionCd === 'BIZ'
                    ? [{ id: 'classGubunTxt', type: 'text', row: 1, label: '분야', defaultValue: 'BIZ', labelVisible: false, enabled: true, width:'60px' }]
                    : []
          ),
          { id: 'selectBtn', type: 'button', label: '선택', labelVisible: false, eventType: 'showClassPopup', enabled: true }, // 분류 선택 버튼
          { id: 'CLASSACD', type: 'select', row: 1, label: '대분류', labelVisible: true, options: [], enabled: true }, // 대분류 드롭다운
          { id: 'CLASSBCD', type: 'select', row: 1, label: '중분류', labelVisible: true, options: [], enabled: true }, // 중분류 드롭다운
          { id: 'CLASSCCD', type: 'select', row: 1, label: '소분류', labelVisible: true, options: [], enabled: true }, // 소분류 드롭다운
          { id: 'dayGubunLbl', type: 'label', row: 2, label: '작업', labelVisible: false, enabled: true }, // 작업 라벨
          { id: 'dayGubun', type: 'select', row: 2, label: '', labelVisible: false, options: [{ value: 'M', label: '월' }, { value: 'D', label: '일' }], defaultValue: 'M', enabled: true }, // 월/일 선택 드롭다운
          { id: 'monthDate', type: 'month', row: 2, width:'74px', label: '', labelVisible: true, placeholder: '월 선택', enabled: false, defaultValue: today }, // 월 선택 입력 (dayGubun: 'M'일 때 표시)
          { id: 'rangeStartDate', type: 'startday', row: 2, width:'100px', label: '', labelVisible: true, placeholder: '시작일 선택', enabled: false, defaultValue: today }, // 시작일 입력 (dayGubun: 'D'일 때 표시)
          { id: 'rangeEndDate', type: 'endday', row: 2, width:'100px', label: ' ~ ', labelVisible: true, placeholder: '종료일 선택', enabled: false, defaultValue: today }, // 종료일 입력 (dayGubun: 'D'일 때 표시)
        ],
      },
      {
        type: 'buttons',
        fields: [
          { id: 'addBtn', type: 'button', row: 1, label: '개별업무등록', eventType: 'showAddPopup', enabled: true }, // 개별업무 추가 버튼
          { id: 'searchBtn', type: 'button', row: 1, label: '검색', eventType: 'search', enabled: true }, // 검색 버튼
        ],
      },
    ],
  };

  // 동적 searchConfig: dayGubun 값에 따라 monthDate 또는 rangeStartDate/rangeEndDate 표시
  const [searchConfig, setSearchConfig] = useState(baseSearchConfig);

  useEffect(() => {
    setPopupClassFilters({
      CLASSACD: 'all',
      CLASSBCD: 'all',
      CLASSCCD: 'all',
    });
  }, [filters.classGubun]);

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
            hasPermission(user?.auth, 'standardOper')
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

  // bizWorkTypeInfoList API 호출 (classGubun이 'BIZ'일 때만)
  useEffect(() => {
    const fetchBizWorkTypes = async () => {
      if (filters.classGubun !== 'BIZ') return;

      try {
        const params = {
          pGUBUN: 'ALL',
          pDEBUG: 'F',
        };
        const response = await fetchData('standard/bizWorkTypeInfoList', params);
        if (!response.success) {
          errorMsgPopup(response.message || 'BIZ 작업 유형 목록을 가져오는 중 오류가 발생했습니다.');
          return;
        }

        const fetchedBizWorkTypes = Array.isArray(response.data) ? response.data : [];
        setBizWorkTypes(fetchedBizWorkTypes);
      } catch (err) {
        console.error('BIZ 작업 유형 목록 로드 실패:', err);
        errorMsgPopup(err.response?.data?.message || 'BIZ 작업 유형 목록을 가져오는 중 오류가 발생했습니다.');
      }
    };
    fetchBizWorkTypes();
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

  useEffect(() => {
    if (tableInstance.current && tableStatus === 'ready') {
      const isBiz = hasPermission(user?.auth, 'standardOper')
        ? filters.classGubun === 'BIZ'
        : user?.standardSectionCd === 'BIZ';

      if (isBiz) {
        tableInstance.current.hideColumn('WORKCNT');
        tableInstance.current.showColumn('BIZTXT');
        tableInstance.current.showColumn('BIZRUNNM');
        tableInstance.current.showColumn('BIZMANNM');
        tableInstance.current.showColumn('BIZWORKGBNM');
        tableInstance.current.showColumn('WORKCNT2');
        tableInstance.current.hideColumn('ATTRIBUTE1');
      } else {
        tableInstance.current.showColumn('WORKCNT');
        tableInstance.current.hideColumn('BIZTXT');
        tableInstance.current.hideColumn('BIZRUNNM');
        tableInstance.current.hideColumn('BIZMANNM');
        tableInstance.current.hideColumn('BIZWORKGBNM');
        tableInstance.current.hideColumn('WORKCNT2');
        tableInstance.current.showColumn('ATTRIBUTE1');
      }
    }
  }, [filters.classGubun, tableStatus, user]);

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

      const isClass2OptionsChanged = !areArraysEqual(prevClass2Options, updatedClass2Options);
      const isClass3OptionsChanged = !areArraysEqual(prevClass3Options, updatedClass3Options);

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
    { headerHozAlign: 'center', hozAlign: 'center', title: 'No', field: 'ID', sorter: 'number', width: 60, frozen: true },
    { headerHozAlign: 'center', hozAlign: 'center', title: '기준일자', field: 'DDATE', sorter: 'string', width: 100, frozen: true },
    { headerHozAlign: 'center', hozAlign: 'center', title: '대분류', field: 'CLASSANM', sorter: 'string', width: 180 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '중분류', field: 'CLASSBNM', sorter: 'string', width: 180 },
    { headerHozAlign: 'center', hozAlign: 'left', title: '소분류', field: 'CLASSCNM', sorter: 'string', width: 220 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '이름', field: 'EMPNM', sorter: 'string', width: 100 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '근무형태코드', field: 'WORKCD', sorter: 'string', width: 100, visible: false },
    { headerHozAlign: 'center', hozAlign: 'center', title: '근무형태', field: 'WORKNM', sorter: 'string', width: 100 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '작업일시', field: 'WORKDT', sorter: 'string', width: 190 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '작업시간', field: 'WORKH', sorter: 'number', width: 100 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '건(구간/본/개소)', field: 'WORKCNT', sorter: 'number', width: 130 },
    { headerHozAlign: 'center', hozAlign: 'left', title: '작업상세', field: 'ATTRIBUTE1', sorter: 'string', width: 600 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '회선번호+고객명', field: 'BIZTXT', sorter: 'string', width: 200, visible: false },
    { headerHozAlign: 'center', hozAlign: 'center', title: '출동여부', field: 'BIZRUNNM', sorter: 'string', width: 130, visible: false },
    { headerHozAlign: 'center', hozAlign: 'center', title: '작업인원', field: 'BIZMANNM', sorter: 'string', width: 130, visible: false },
    { headerHozAlign: 'center', hozAlign: 'center', title: '프로세스', field: 'BIZWORKGBNM', sorter: 'string', width: 130, visible: false },
    { headerHozAlign: 'center', hozAlign: 'center', title: '회선수', field: 'WORKCNT2', sorter: 'number', width: 130, visible: false },
  ];

  const loadData = async () => {
    setLoading(true);
    setIsSearched(true);

    if (filters.dayGubun === 'D') {
      const maxMonths = 3;
      const monthRange = common.checkMonthRange(filters.rangeStartDate, filters.rangeEndDate, maxMonths);
      if (maxMonths <= monthRange) {
        msgPopup(`${maxMonths}개월까지만 가능합니다.`);
        setLoading(false);
        return;
      }
    }

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
        pCLASSCD: (filters.CLASSCCD === '' || filters.CLASSCCD === 'all') 
            ? ((filters.CLASSBCD === '' || filters.CLASSBCD === 'all') 
                ? ((filters.CLASSACD === '' || filters.CLASSACD === 'all') 
                    ? '' 
                    : filters.CLASSACD) 
                : filters.CLASSBCD) 
            : filters.CLASSCCD,
        pDATEGUBUN: filters.dayGubun,
        pDATE1: (filters.dayGubun === 'D') ? filters.rangeStartDate : (filters.dayGubun === 'M' ? filters.monthDate : ''),
        pDATE2: (filters.dayGubun === 'D') ? filters.rangeEndDate : (filters.dayGubun === 'M' ? filters.monthDate : ''),
        pDEBUG: 'F',
      };

      const response = await fetchData('standard/empJob/list', params);
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
    } else if (eventType === 'showClassPopup') {
      setShowClassPopup(true);
    } else if (eventType === 'showAddPopup') {
      setPopupClassFilters({
        CLASSACD: '',
        CLASSBCD: '',
        CLASSCCD: '',
      });
      setShowAddPopup(true);
    } else if (eventType === 'selectChange') {
      const { id, value } = payload;
      setFilters((prev) => {
        const newFilters = { ...prev, [id]: value };
        if (id === 'classGubun') {
          newFilters.CLASSACD = '';
          newFilters.CLASSBCD = '';
          newFilters.CLASSCCD = '';
        } else if (id === 'CLASSACD') {
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

  const areArraysEqual = (arr1, arr2) => {
    if (arr1 === arr2) return true;
    if (!arr1 || !arr2 || arr1.length !== arr2.length) return false;
    return arr1.every((item, index) => 
      item.value === arr2[index]?.value && item.label === arr2[index]?.label
    );
  };

  const currentPopupFilters = {
    ...filters,
    CLASSACD: popupClassFilters.CLASSACD,
    CLASSBCD: popupClassFilters.CLASSBCD,
    CLASSCCD: popupClassFilters.CLASSCCD,
  };

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
      {filters.classGubun === 'BIZ' ? (
        <StandardBizEmpJobRegPopup show={showAddPopup} onHide={handleAddCancel} filters={currentPopupFilters} data={classData} bizWorkTypes={bizWorkTypes} />
      ) : (
        <StandardEmpJobRegPopup show={showAddPopup} onHide={handleAddCancel} filters={currentPopupFilters} data={classData} />
      )}
    </div>
  );
};

export default StandardEmpJobManage;
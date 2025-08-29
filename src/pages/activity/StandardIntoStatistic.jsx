import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import StandardClassSelectPopup from './popup/StandardClassSelectPopup';
import OrgSearchPopup from '../../components/popup/OrgSearchPopup';
import StandardOrgDayStatisticPopup from './popup/StandardOrgDayStatisticPopup';

const getFieldOptions = (fieldId, dependentValue = '', classData) => {
  if (!Array.isArray(classData)) {
    return [];
  }

  const uniqueMap = new Map();

  if (fieldId === 'CLASSACD') {
    classData.forEach((item) => {
      if (item.CLASSACD && item.CLASSANM && !uniqueMap.has(item.CLASSACD)) {
        uniqueMap.set(item.CLASSACD, { value: item.CLASSACD, label: item.CLASSANM });
      }
    });
    const options = [{ value: 'all', label: '==대분류==' }, ...Array.from(uniqueMap.values())];
    return options;
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
    const options = [{ value: 'all', label: '==중분류==' }, ...Array.from(uniqueMap.values())];
    return options;
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
    const options = [{ value: 'all', label: '==소분류==' }, ...Array.from(uniqueMap.values())];
    return options;
  }

  if (fieldId === 'filterSelect') {
    const options = [
      { value: '', label: '선택' },
      { value: 'CLASSANM', label: '대분류' },
      { value: 'CLASSBNM', label: '중분류' },
      { value: 'CLASSCNM', label: '소분류' },
    ];
    return options;
  }

  return [];
};

const StandardIntoStatistic = () => {
  const { user } = useStore();
  const navigate = useNavigate();
  const today = common.getTodayDate();
  const [filters, setFilters] = useState({
    classGubun: user?.standardSectionCd || 'LINE',
    classGubunTxt: user?.standardSectionCd === 'LINE' ? '선로' : user?.standardSectionCd === 'DESIGN' ? '설계' : user?.standardSectionCd === 'BIZ' ? 'BIZ' : '선로',
    monthDate: today.substring(0, 7),
    ORGCD: '',
    orgText: '',
    CLASSACD: 'all',
    CLASSBCD: 'all',
    CLASSCCD: 'all',
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
  const [showOrgPopup, setShowOrgPopup] = useState(false);
  const [showClassPopup, setShowClassPopup] = useState(false);
  const [classData, setClassData] = useState([]);
  const [showStatisticPopup, setShowStatisticPopup] = useState(false);
  const [selectedData, setSelectedData] = useState(null);

  // 공통 cellClick 핸들러
  const handleDayClick = (cell, day) => {
    const rowData = cell.getRow().getData();
    const sectionCd = hasPermission(user?.auth, 'oper') ? filters.classGubun : user?.standardSectionCd || 'LINE';
    const classCd = rowData.CLASSCCD || rowData.CLASSBCD || rowData.CLASSACD || '';
    setSelectedData({
      SECTIONCD: sectionCd,
      ORGCD: filters.ORGCD || '',
      DDATE: `${rowData.MDATE}-${day.padStart(2, '0')}`,
      CLASSCD: classCd,
    });
    setShowStatisticPopup(true);
  };

  // filterSelect 옵션 동적 생성
  const filterSelectOptions = useMemo(() => {
    const options = getFieldOptions('filterSelect');
    if (options.length === 0) {
      return [
        { value: '', label: '선택' },
        { value: 'CLASSANM', label: '대분류' },
        { value: 'CLASSBNM', label: '중분류' },
        { value: 'CLASSCNM', label: '소분류' },
      ];
    }
    return options;
  }, []);

  // filterTableFields 동적 생성
  const filterTableFields = useMemo(() => {
    const fields = [
      {
        id: 'filterSelect',
        type: 'select',
        label: '',
        options: filterSelectOptions,
        width: '150px',
        height: '30px',
        backgroundColor: '#ffffff',
        color: '#000000',
        enabled: true,
      },
      {
        id: 'filterText',
        type: 'text',
        label: '',
        placeholder: '찾을 내용을 입력하세요',
        width: '200px',
        height: '30px',
        backgroundColor: '#ffffff',
        color: '#000000',
        enabled: true,
      },
    ];
    return fields;
  }, [filterSelectOptions]);

  // useMemo로 옵션 최적화
  const updatedClass1Options = useMemo(
    () => getFieldOptions('CLASSACD', '', classData),
    [classData]
  );
  const updatedClass2Options = useMemo(
    () => getFieldOptions('CLASSBCD', filters.CLASSACD, classData),
    [filters.CLASSACD, classData]
  );
  const updatedClass3Options = useMemo(
    () => getFieldOptions('CLASSCCD', filters.CLASSBCD, classData),
    [filters.CLASSBCD, classData]
  );

  // pGUBUN 동적 설정
  const pGUBUN = useMemo(() => {
    if (showOrgPopup) {
      if (filters.classGubun === 'BIZ') {
        return 'STABIZEMPNO';
      } else if (filters.classGubun === 'DESIGN') {
        return 'STADESIGNEMPNO';
      } else if (filters.classGubun === 'LINE') {
        return 'STALINEEMPNO';
      }
      return 'OPEREMPNO';
    }
    return 'OPEREMPNO';
  }, [showOrgPopup, filters.classGubun]);

  // 초기 searchConfig 설정
  const [searchConfig, setSearchConfig] = useState({
    areas: [
      {
        type: 'search',
        fields: [
          { id: 'classGubunLbl', type: 'label', row: 1, label: '분야', labelVisible: false, enabled: true },
          ...(hasPermission(user?.auth, 'oper')
            ? [{ id: 'classGubun', type: 'select', row: 1, label: '분야', labelVisible: false, options: [{ value: 'LINE', label: '선로' }, { value: 'DESIGN', label: '설계' }, { value: 'BIZ', label: 'BIZ' }], defaultValue: 'LINE', enabled: true }]
            : user?.standardSectionCd === 'LINE'
              ? [{ id: 'classGubunTxt', type: 'text', row: 1, label: '분야', defaultValue: '선로', labelVisible: false, enabled: true }]
              : user?.standardSectionCd === 'DESIGN'
                ? [{ id: 'classGubunTxt', type: 'text', row: 1, label: '분야', defaultValue: '설계', labelVisible: false, enabled: true }]
                : user?.standardSectionCd === 'BIZ'
                  ? [{ id: 'classGubunTxt', type: 'text', row: 1, label: '분야', defaultValue: 'BIZ', labelVisible: false, enabled: true }]
                  : []),
          { id: 'monthDate', type: 'month', row: 1, width: '110px', label: '월', labelVisible: true, placeholder: '월 선택', enabled: true, defaultValue: today.substring(0, 7) },
          { id: 'orgText', type: 'text', row: 1, label: '조직', labelVisible: true, placeholder: '조직 선택', enabled: false },
          { id: 'orgPopupBtn', type: 'popupIcon', row: 1, label: '조직 선택', labelVisible: false, eventType: 'showOrgPopup', enabled: true },
          { id: 'selectBtn', type: 'button', label: '선택', labelVisible: false, eventType: 'showClassPopup', enabled: true },
          { id: 'CLASSACD', type: 'select', row: 1, label: '', labelVisible: true, options: [], enabled: true },
          { id: 'CLASSBCD', type: 'select', row: 1, label: '', labelVisible: true, options: [], enabled: true },
          { id: 'CLASSCCD', type: 'select', row: 1, label: '', labelVisible: true, options: [], enabled: true },
        ],
      },
      {
        type: 'buttons',
        fields: [
          { id: 'searchBtn', type: 'button', row: 1, label: '검색', eventType: 'search', enabled: true },
        ],
      },
    ],
  });

  // filters 초기화
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      monthDate: prev.monthDate || today.substring(0, 7),
    }));
    const initialTableFilters = initialFilters(filterTableFields);
    setTableFilters(initialTableFilters);
  }, [today, filterTableFields]);

  // classData API 호출
  useEffect(() => {
    const fetchClassData = async () => {
      if (!filters.classGubun) return;
      try {
        const params = {
          pGUBUN: hasPermission(user?.auth, 'oper')
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
      } catch (err) {
        console.error('분류 목록 로드 실패:', err);
        errorMsgPopup('분류 목록을 가져오는 중 오류가 발생했습니다.');
      }
    };
    fetchClassData();
  }, [filters.classGubun, user]);

  // classData 또는 dependent values 변경 시 searchConfig 업데이트
  useEffect(() => {
    setSearchConfig((prev) => {
      const newAreas = prev.areas.map((area) => {
        if (area.type !== 'search') return area;
        const newFields = area.fields.map((field) => {
          if (field.id === 'CLASSACD') return { ...field, options: updatedClass1Options };
          if (field.id === 'CLASSBCD') return { ...field, options: updatedClass2Options };
          if (field.id === 'CLASSCCD') return { ...field, options: updatedClass3Options };
          return field;
        });
        return { ...area, fields: newFields };
      });
      return { ...prev, areas: newAreas };
    });
  }, [updatedClass1Options, updatedClass2Options, updatedClass3Options]);

  // columns 정의
  const columns = [
    { headerHozAlign: 'center', hozAlign: 'center', title: 'ID', field: 'ID', sorter: 'number', width: 60, frozen: true },
    { headerHozAlign: 'center', hozAlign: 'center', title: '대분류 코드', field: 'CLASSACD', sorter: 'string', width: 120, visible: false, frozen: true },
    { headerHozAlign: 'center', hozAlign: 'left', title: '대분류', field: 'CLASSANM', sorter: 'string', width: 150, frozen: true },
    { headerHozAlign: 'center', hozAlign: 'center', title: '중분류 코드', field: 'CLASSBCD', sorter: 'string', width: 120, visible: false, frozen: true },
    { headerHozAlign: 'center', hozAlign: 'left', title: '중분류', field: 'CLASSBNM', sorter: 'string', width: 150, frozen: true },
    { headerHozAlign: 'center', hozAlign: 'center', title: '소분류 코드', field: 'CLASSCCD', sorter: 'string', width: 120, visible: false, frozen: true },
    { headerHozAlign: 'center', hozAlign: 'left', title: '소분류', field: 'CLASSCNM', sorter: 'string', width: 190, frozen: true },
    { headerHozAlign: 'center', hozAlign: 'center', title: '월누계', field: 'MONTH_TOTAL', sorter: 'number', width: 100 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '월', field: 'MDATE', sorter: 'number', width: 100, visible: false },
    {
      headerHozAlign: 'center',
      hozAlign: 'center',
      title: '01일',
      field: 'DAY_01',
      sorter: 'number',
      width: 80,
      cellClick: (e, cell) => handleDayClick(cell, '01'),
      cellStyle: { color: '#247db3' },
    },
    {
      headerHozAlign: 'center',
      hozAlign: 'center',
      title: '02일',
      field: 'DAY_02',
      sorter: 'number',
      width: 80,
      cellClick: (e, cell) => handleDayClick(cell, '02'),
      cellStyle: { color: '#247db3' },
    },
    {
      headerHozAlign: 'center',
      hozAlign: 'center',
      title: '03일',
      field: 'DAY_03',
      sorter: 'number',
      width: 80,
      cellClick: (e, cell) => handleDayClick(cell, '03'),
      cellStyle: { color: '#247db3' },
    },
    {
      headerHozAlign: 'center',
      hozAlign: 'center',
      title: '04일',
      field: 'DAY_04',
      sorter: 'number',
      width: 80,
      cellClick: (e, cell) => handleDayClick(cell, '04'),
      cellStyle: { color: '#247db3' },
    },
    {
      headerHozAlign: 'center',
      hozAlign: 'center',
      title: '05일',
      field: 'DAY_05',
      sorter: 'number',
      width: 80,
      cellClick: (e, cell) => handleDayClick(cell, '05'),
      cellStyle: { color: '#247db3' },
    },
    {
      headerHozAlign: 'center',
      hozAlign: 'center',
      title: '06일',
      field: 'DAY_06',
      sorter: 'number',
      width: 80,
      cellClick: (e, cell) => handleDayClick(cell, '06'),
      cellStyle: { color: '#247db3' },
    },
    {
      headerHozAlign: 'center',
      hozAlign: 'center',
      title: '07일',
      field: 'DAY_07',
      sorter: 'number',
      width: 80,
      cellClick: (e, cell) => handleDayClick(cell, '07'),
      cellStyle: { color: '#247db3' },
    },
    {
      headerHozAlign: 'center',
      hozAlign: 'center',
      title: '08일',
      field: 'DAY_08',
      sorter: 'number',
      width: 80,
      cellClick: (e, cell) => handleDayClick(cell, '08'),
      cellStyle: { color: '#247db3' },
    },
    {
      headerHozAlign: 'center',
      hozAlign: 'center',
      title: '09일',
      field: 'DAY_09',
      sorter: 'number',
      width: 80,
      cellClick: (e, cell) => handleDayClick(cell, '09'),
      cellStyle: { color: '#247db3' },
    },
    {
      headerHozAlign: 'center',
      hozAlign: 'center',
      title: '10일',
      field: 'DAY_10',
      sorter: 'number',
      width: 80,
      cellClick: (e, cell) => handleDayClick(cell, '10'),
      cellStyle: { color: '#247db3' },
    },
    {
      headerHozAlign: 'center',
      hozAlign: 'center',
      title: '11일',
      field: 'DAY_11',
      sorter: 'number',
      width: 80,
      cellClick: (e, cell) => handleDayClick(cell, '11'),
      cellStyle: { color: '#247db3' },
    },
    {
      headerHozAlign: 'center',
      hozAlign: 'center',
      title: '12일',
      field: 'DAY_12',
      sorter: 'number',
      width: 80,
      cellClick: (e, cell) => handleDayClick(cell, '12'),
      cellStyle: { color: '#247db3' },
    },
    {
      headerHozAlign: 'center',
      hozAlign: 'center',
      title: '13일',
      field: 'DAY_13',
      sorter: 'number',
      width: 80,
      cellClick: (e, cell) => handleDayClick(cell, '13'),
      cellStyle: { color: '#247db3' },
    },
    {
      headerHozAlign: 'center',
      hozAlign: 'center',
      title: '14일',
      field: 'DAY_14',
      sorter: 'number',
      width: 80,
      cellClick: (e, cell) => handleDayClick(cell, '14'),
      cellStyle: { color: '#247db3' },
    },
    {
      headerHozAlign: 'center',
      hozAlign: 'center',
      title: '15일',
      field: 'DAY_15',
      sorter: 'number',
      width: 80,
      cellClick: (e, cell) => handleDayClick(cell, '15'),
      cellStyle: { color: '#247db3' },
    },
    {
      headerHozAlign: 'center',
      hozAlign: 'center',
      title: '16일',
      field: 'DAY_16',
      sorter: 'number',
      width: 80,
      cellClick: (e, cell) => handleDayClick(cell, '16'),
      cellStyle: { color: '#247db3' },
    },
    {
      headerHozAlign: 'center',
      hozAlign: 'center',
      title: '17일',
      field: 'DAY_17',
      sorter: 'number',
      width: 80,
      cellClick: (e, cell) => handleDayClick(cell, '17'),
      cellStyle: { color: '#247db3' },
    },
    {
      headerHozAlign: 'center',
      hozAlign: 'center',
      title: '18일',
      field: 'DAY_18',
      sorter: 'number',
      width: 80,
      cellClick: (e, cell) => handleDayClick(cell, '18'),
      cellStyle: { color: '#247db3' },
    },
    {
      headerHozAlign: 'center',
      hozAlign: 'center',
      title: '19일',
      field: 'DAY_19',
      sorter: 'number',
      width: 80,
      cellClick: (e, cell) => handleDayClick(cell, '19'),
      cellStyle: { color: '#247db3' },
    },
    {
      headerHozAlign: 'center',
      hozAlign: 'center',
      title: '20일',
      field: 'DAY_20',
      sorter: 'number',
      width: 80,
      cellClick: (e, cell) => handleDayClick(cell, '20'),
      cellStyle: { color: '#247db3' },
    },
    {
      headerHozAlign: 'center',
      hozAlign: 'center',
      title: '21일',
      field: 'DAY_21',
      sorter: 'number',
      width: 80,
      cellClick: (e, cell) => handleDayClick(cell, '21'),
      cellStyle: { color: '#247db3' },
    },
    {
      headerHozAlign: 'center',
      hozAlign: 'center',
      title: '22일',
      field: 'DAY_22',
      sorter: 'number',
      width: 80,
      cellClick: (e, cell) => handleDayClick(cell, '22'),
      cellStyle: { color: '#247db3' },
    },
    {
      headerHozAlign: 'center',
      hozAlign: 'center',
      title: '23일',
      field: 'DAY_23',
      sorter: 'number',
      width: 80,
      cellClick: (e, cell) => handleDayClick(cell, '23'),
      cellStyle: { color: '#247db3' },
    },
    {
      headerHozAlign: 'center',
      hozAlign: 'center',
      title: '24일',
      field: 'DAY_24',
      sorter: 'number',
      width: 80,
      cellClick: (e, cell) => handleDayClick(cell, '24'),
      cellStyle: { color: '#247db3' },
    },
    {
      headerHozAlign: 'center',
      hozAlign: 'center',
      title: '25일',
      field: 'DAY_25',
      sorter: 'number',
      width: 80,
      cellClick: (e, cell) => handleDayClick(cell, '25'),
      cellStyle: { color: '#247db3' },
    },
    {
      headerHozAlign: 'center',
      hozAlign: 'center',
      title: '26일',
      field: 'DAY_26',
      sorter: 'number',
      width: 80,
      cellClick: (e, cell) => handleDayClick(cell, '26'),
      cellStyle: { color: '#247db3' },
    },
    {
      headerHozAlign: 'center',
      hozAlign: 'center',
      title: '27일',
      field: 'DAY_27',
      sorter: 'number',
      width: 80,
      cellClick: (e, cell) => handleDayClick(cell, '27'),
      cellStyle: { color: '#247db3' },
    },
    {
      headerHozAlign: 'center',
      hozAlign: 'center',
      title: '28일',
      field: 'DAY_28',
      sorter: 'number',
      width: 80,
      cellClick: (e, cell) => handleDayClick(cell, '28'),
      cellStyle: { color: '#247db3' },
    },
    {
      headerHozAlign: 'center',
      hozAlign: 'center',
      title: '29일',
      field: 'DAY_29',
      sorter: 'number',
      width: 80,
      cellClick: (e, cell) => handleDayClick(cell, '29'),
      cellStyle: { color: '#247db3' },
    },
    {
      headerHozAlign: 'center',
      hozAlign: 'center',
      title: '30일',
      field: 'DAY_30',
      sorter: 'number',
      width: 80,
      cellClick: (e, cell) => handleDayClick(cell, '30'),
      cellStyle: { color: '#247db3' },
    },
    {
      headerHozAlign: 'center',
      hozAlign: 'center',
      title: '31일',
      field: 'DAY_31',
      sorter: 'number',
      width: 80,
      cellClick: (e, cell) => handleDayClick(cell, '31'),
      cellStyle: { color: '#247db3' },
    },
  ];

  const loadData = async () => {
    setLoading(true);
    setIsSearched(true);
    try {
      const params = {
        pGUBUN: 'LIST',
        pSECTIONCD: hasPermission(user?.auth, 'oper')
          ? filters.classGubun
          : user?.standardSectionCd === 'LINE'
            ? 'LINE'
            : user?.standardSectionCd === 'DESIGN'
              ? 'DESIGN'
              : user?.standardSectionCd === 'BIZ'
                ? 'BIZ'
                : 'LINE',
        pEMPNO: user?.empNo || '',
        pORGCD: filters.ORGCD || '',
        pDATE1: filters.monthDate,
        pCLASSCD: (filters.CLASSCCD === '' || filters.CLASSCCD === 'all')
          ? ((filters.CLASSBCD === '' || filters.CLASSBCD === 'all')
              ? ((filters.CLASSACD === '' || filters.CLASSACD === 'all')
                  ? ''
                  : filters.CLASSACD)
              : filters.CLASSBCD)
          : filters.CLASSCCD,
        pDEBUG: 'F',
      };

      const response = await fetchData('standard/intoList/list', params);
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
    } else if (eventType === 'showOrgPopup') {
      setShowOrgPopup(true);
    } else if (eventType === 'showClassPopup') {
      setShowClassPopup(true);
    } else if (eventType === 'selectChange') {
      setFilters((prev) => ({
        ...prev,
        [payload.id]: payload.value,
        ...(payload.id === 'CLASSACD' ? { CLASSBCD: 'all', CLASSCCD: 'all' } : payload.id === 'CLASSBCD' ? { CLASSCCD: 'all' } : {}),
      }));
    }
  };

  const handleOrgConfirm = (selectedRows) => {
    if (!selectedRows || selectedRows.length === 0) return;
    const newOrgCd = selectedRows.map((row) => row.ORGCD).join(',');
    const newOrgNm = selectedRows.map((row) => row.ORGNM).join(',');
    setFilters((prev) => ({ ...prev, ORGCD: newOrgCd, orgText: newOrgNm }));
    setShowOrgPopup(false);
  };

  const handleClassSelect = ({ major, middle, minor }) => {
    setFilters((prev) => ({
      ...prev,
      CLASSACD: major,
      CLASSBCD: middle,
      CLASSCCD: minor,
    }));
    setShowClassPopup(false);
  };

  const handleOrgCancel = () => {
    setShowOrgPopup(false);
  };

  if (user === null) {
    return <div>사용자 정보 로드 중...</div>;
  }

  return (
    <div className="container">
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
        onDownloadExcel={() => handleDownloadExcel(tableInstance.current, tableStatus, '투입업무량현황.xlsx')}
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
      <StandardClassSelectPopup
        show={showClassPopup}
        onHide={() => setShowClassPopup(false)}
        onSelect={handleClassSelect}
        data={classData}
      />
      <StandardOrgDayStatisticPopup
        show={showStatisticPopup}
        onHide={() => setShowStatisticPopup(false)}
        data={selectedData ? [selectedData] : []}
      />
    </div>
  );
};

export default StandardIntoStatistic;
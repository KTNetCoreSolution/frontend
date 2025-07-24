import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../../store/store';
import { hasPermission } from '../../utils/authUtils';
import CommonPopup from '../../components/popup/CommonPopup';
import MainSearch from '../../components/main/MainSearch';
import TableSearch from '../../components/table/TableSearch';
import { createTable } from '../../utils/tableConfig';
import { initialFilters } from '../../utils/tableEvent';
import { handleDownloadExcel } from '../../utils/tableExcel';
import styles from '../../components/table/TableSearch.module.css';
import { errorMsgPopup } from '../../utils/errorMsgPopup';
import { msgPopup } from '../../utils/msgPopup';
import class1Data from '../../data/standardactivity_class1.json';
import class2Data from '../../data/standardactivity_class2.json';
import class3Data from '../../data/standardactivity_class3.json';
import empData from '../../data/standardactivity_emp_data.json';
import workTypeData from '../../data/standardactivity_job.json';

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

const getFieldOptions = (fieldId, dependentValue = '') => {
  const optionsMap = {
    CLASSACD: class1Data.map((item) => ({ value: item.CLASSACD, label: item.CLASSANM })),
    CLASSBCD: class2Data.filter((item) => !dependentValue || item.CLASSACD === dependentValue).map((item) => ({ value: item.CLASSBCD, label: item.CLASSBNM })),
    CLASSCCD: class3Data.filter((item) => !dependentValue || item.CLASSBCD === dependentValue).map((item) => ({ value: item.CLASSCCD, label: item.CLASSCNM })),
    WORKTYPE: workTypeData.map((item) => ({ value: item.value, label: item.label })),
    filterSelect: [{ value: '', label: '선택' }, { value: 'CLASSANM', label: '대분류' }, { value: 'CLASSBNM', label: '중분류' }, { value: 'CLASSCNM', label: '소분류' }, { value: 'NAME', label: '이름' }, { value: 'WORKTYPE', label: '근무형태' }],
  };
  return optionsMap[fieldId] || [];
};

const filterTableFields = [{ id: 'filterSelect', type: 'select', label: '', options: getFieldOptions('filterSelect'), width: '150px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true }, { id: 'filterText', type: 'text', label: '', placeholder: '찾을 내용을 입력하세요', width: '200px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true }];

const StandardEmpJobManage = () => {
  const { user } = useStore();
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  const [showClassPopup, setShowClassPopup] = useState(false);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [filters, setFilters] = useState({});
  const [tableFilters, setTableFilters] = useState({});
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [isSearched, setIsSearched] = useState(false);
  const [tableStatus, setTableStatus] = useState('initializing');
  const [rowCount, setRowCount] = useState(0);
  const tableRef = useRef(null);
  const tableInstance = useRef(null);
  const isInitialRender = useRef(true);

  const [searchConfig, setSearchConfig] = useState({
    areas: [
      {
        type: 'search',
        fields: [
          { id: 'selectBtn', type: 'button', label: '선택', labelVisible: false, eventType: 'showClassPopup', width: '60px', height: '30px', backgroundColor: '#00c4b4', color: '#ffffff', enabled: true },
          { id: 'CLASSACD', type: 'select', row: 1, label: '대분류', labelVisible: true, options: [{ value: 'all', label: '==대분류==' }, ...getFieldOptions('CLASSACD')], width: '200px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true },
          { id: 'CLASSBCD', type: 'select', row: 1, label: '중분류', labelVisible: true, options: [{ value: 'all', label: '==중분류==' }, ...getFieldOptions('CLASSBCD', 'all')], width: '200px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true },
          { id: 'CLASSCCD', type: 'select', row: 1, label: '소분류', labelVisible: true, options: [{ value: 'all', label: '==소분류==' }, ...getFieldOptions('CLASSCCD', 'all')], width: '200px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true },
          { id: 'rangeStartDate', type: 'startday', row: 2, label: '작업일시', labelVisible: true, placeholder: '시작일 선택', width: '200px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true, defaultValue: today },
          { id: 'rangeEndDate', type: 'endday', row: 2, label: ' ~ ', labelVisible: true, placeholder: '종료일 선택', width: '200px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true, defaultValue: today },
          { id: 'WORKTYPE', type: 'select', row: 2, label: '근무형태', labelVisible: true, options: getFieldOptions('WORKTYPE'), width: '150px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true },
        ],
      },
      {
        type: 'buttons',
        fields: [
          { id: 'addBtn', type: 'button', row: 1, label: '개별업무', eventType: 'showAddPopup', width: '100px', height: '30px', backgroundColor: '#00c4b4', color: '#ffffff', enabled: true },
          { id: 'searchBtn', type: 'button', row: 1, label: '검색', eventType: 'search', width: '80px', height: '30px', backgroundColor: '#00c4b4', color: '#ffffff', enabled: true },
        ],
      },
    ],
  });

  useEffect(() => {
    setFilters((prev) => ({
      ...initialFilters(searchConfig.areas.find((area) => area.type === 'search').fields),
      rangeStartDate: prev.rangeStartDate || today,
      rangeEndDate: prev.rangeEndDate || today,
    }));
  }, [searchConfig]);

  useEffect(() => {
    setTableFilters(initialFilters(filterTableFields));
  }, []);

  useEffect(() => {
    setSearchConfig((prevConfig) => ({
      ...prevConfig,
      areas: [
        {
          ...prevConfig.areas[0],
          fields: [
            { ...prevConfig.areas[0].fields[0] },
            { ...prevConfig.areas[0].fields[1], options: [{ value: 'all', label: '==대분류==' }, ...getFieldOptions('CLASSACD')] },
            { ...prevConfig.areas[0].fields[2], options: [{ value: 'all', label: '==중분류==' }, ...getFieldOptions('CLASSBCD', filters.CLASSACD || 'all')] },
            { ...prevConfig.areas[0].fields[3], options: [{ value: 'all', label: '==소분류==' }, ...getFieldOptions('CLASSCCD', filters.CLASSBCD || 'all')] },
            { ...prevConfig.areas[0].fields[4] },
            { ...prevConfig.areas[0].fields[5] },
            { ...prevConfig.areas[0].fields[6] },
          ],
        },
        prevConfig.areas[1],
      ],
    }));
  }, [filters.CLASSACD, filters.CLASSBCD]);

  const columns = [
    { frozen: true, headerHozAlign: 'center', hozAlign: 'center', title: '작업', field: 'actions', width: 80, formatter: (cell) => { const button = document.createElement('button'); button.className = `btn btn-sm btn-danger ${styles.deleteButton}`; button.innerText = '삭제'; button.onclick = () => handleDelete(cell.getData()); return button; } },
    { frozen: true, headerHozAlign: 'center', hozAlign: 'center', title: '작업대상', field: 'applyTarget', sorter: 'string', width: 100, formatter: (cell) => { const rowData = cell.getRow().getData(); let label = ''; let stateField = ''; if (rowData.isDeleted === 'Y') { label = '삭제'; stateField = 'isDeleted'; } else if (rowData.isAdded === 'Y') { label = '추가'; stateField = 'isAdded'; } else if (rowData.isChanged === 'Y') { label = '변경'; stateField = 'isChanged'; } if (!label) return ''; const div = document.createElement('div'); div.style.display = 'flex'; div.style.alignItems = 'center'; div.style.justifyContent = 'center'; div.style.gap = '5px'; const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = rowData[stateField] === 'Y'; checkbox.onclick = () => { setTimeout(() => { setData((prevData) => prevData.map((row) => { if (row.ID === rowData.ID) { const updatedRow = { ...row, [stateField]: checkbox.checked ? 'Y' : 'N' }; if (stateField === 'isDeleted' && !checkbox.checked) { updatedRow.isChanged = 'N'; } if (stateField === 'isAdded' && !checkbox.checked) { return null; } return updatedRow; } return row; }).filter(Boolean)); }, 0); }; const span = document.createElement('span'); span.innerText = label; div.appendChild(checkbox); div.appendChild(span); return div; } },
    { headerHozAlign: 'center', hozAlign: 'center', title: 'No', field: 'ID', sorter: 'number', width: 80 },
    { headerHozAlign: 'center', hozAlign: 'left', title: '대분류', field: 'CLASSANM', sorter: 'string', width: 150 },
    { headerHozAlign: 'center', hozAlign: 'left', title: '중분류', field: 'CLASSBNM', sorter: 'string', width: 150 },
    { headerHozAlign: 'center', hozAlign: 'left', title: '소분류', field: 'CLASSCNM', sorter: 'string', width: 250 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '이름', field: 'NAME', sorter: 'string', width: 100 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '근무형태', field: 'WORKTYPE', sorter: 'string', width: 100, ...fn_CellSelect(workTypeData.map((item) => item.value)), cellEdited: (cell) => fn_HandleCellEdit(cell, 'WORKTYPE', setData, tableInstance) },
    { headerHozAlign: 'center', hozAlign: 'center', title: '작업일시', field: 'WORKDATETIME', sorter: 'string', width: 150, formatter: (cell) => `${cell.getData().WORKDATE} ${cell.getData().STARTTIME} ~ ${cell.getData().ENDTIME}` },
    { headerHozAlign: 'center', hozAlign: 'center', title: '작업시간', field: 'WORKHOURS', sorter: 'number', width: 100, ...fn_CellNumber, cellEdited: (cell) => fn_HandleCellEdit(cell, 'WORKHOURS', setData, tableInstance) },
    { headerHozAlign: 'center', hozAlign: 'center', title: '건(구간/본/개소)', field: 'QUANTITY', sorter: 'number', width: 150, ...fn_CellNumber, cellEdited: (cell) => fn_HandleCellEdit(cell, 'QUANTITY', setData, tableInstance) },
  ];

  const loadData = () => {
    setLoading(true);
    setIsSearched(true);
    try {
      const filteredData = empData.map((row, index) => ({
        ID: String(index + 1),
        CLASSACD: row.CLASSACD,
        CLASSBCD: row.CLASSBCD,
        CLASSCCD: row.CLASSCCD,
        CLASSANM: class1Data.find((c) => c.CLASSACD === row.CLASSACD)?.CLASSANM || '',
        CLASSBNM: class2Data.find((c) => c.CLASSBCD === row.CLASSBCD)?.CLASSBNM || '',
        CLASSCNM: class3Data.find((c) => c.CLASSCCD === row.CLASSCCD)?.CLASSCNM || '',
        NAME: row.NAME,
        WORKTYPE: row.WORKTYPE,
        WORKDATE: row.WORKDATE,
        STARTTIME: row.STARTTIME,
        ENDTIME: row.ENDTIME,
        WORKHOURS: row.WORKHOURS,
        QUANTITY: row.QUANTITY,
        WORKDATETIME: `${row.WORKDATE} ${row.STARTTIME} ~ ${row.ENDTIME}`,
        isDeleted: 'N',
        isAdded: 'N',
        isChanged: 'N',
      })).filter((row) => (
        (!filters.CLASSACD || filters.CLASSACD === 'all' || row.CLASSACD === filters.CLASSACD) &&
        (!filters.CLASSBCD || filters.CLASSBCD === 'all' || row.CLASSBCD === filters.CLASSBCD) &&
        (!filters.CLASSCCD || filters.CLASSCCD === 'all' || row.CLASSCCD === filters.CLASSCCD) &&
        (!filters.WORKTYPE || row.WORKTYPE === filters.WORKTYPE) &&
        (!filters.rangeStartDate || row.WORKDATE >= filters.rangeStartDate) &&
        (!filters.rangeEndDate || row.WORKDATE <= filters.rangeEndDate)
      ));
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
    if (!user || !hasPermission(user.auth, 'standardactivity')) navigate('/');
  }, [user, navigate]);

  useEffect(() => {
    const initializeTable = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (!tableRef.current) {
        console.warn('테이블 컨테이너가 준비되지 않았습니다.');
        return;
      }
      try {
        tableInstance.current = createTable(tableRef.current, columns, [], { headerHozAlign: 'center', layout: 'fitColumns', rowFormatter: (row) => { const data = row.getData(); const el = row.getElement(); el.classList.remove(styles.deletedRow, styles.addedRow, styles.editedRow); if (data.isDeleted === 'Y') el.classList.add(styles.deletedRow); else if (data.isAdded === 'Y') el.classList.add(styles.addedRow); else if (data.isChanged === 'Y') el.classList.add(styles.editedRow); } });
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
        tableInstance.current.setFilter([{ field: 'CLASSANM', type: 'like', value: filterText }, { field: 'CLASSBNM', type: 'like', value: filterText }, { field: 'CLASSCNM', type: 'like', value: filterText }, { field: 'NAME', type: 'like', value: filterText }, { field: 'WORKTYPE', type: 'like', value: filterText }], 'or');
      } else {
        tableInstance.current.clearFilter();
      }
    } else if (filterSelect) {
      tableInstance.current.clearFilter();
    }
  }, [tableFilters.filterSelect, tableFilters.filterText, tableStatus, loading]);

  const handleDynamicEvent = (eventType, eventData) => {
    if (eventType === 'search') {
      loadData();
    } else if (eventType === 'showClassPopup') {
      setShowClassPopup(true);
    } else if (eventType === 'showAddPopup') {
      setShowAddPopup(true);
    } else if (eventType === 'selectChange') {
      const { id, value } = eventData;
      setFilters((prev) => {
        const updatedFilters = { ...prev, [id]: value };
        if (id === 'CLASSACD' && value !== 'all') {
          updatedFilters.CLASSBCD = 'all';
          updatedFilters.CLASSCCD = 'all';
        } else if (id === 'CLASSBCD' && value !== 'all') {
          updatedFilters.CLASSCCD = 'all';
        }
        return { ...updatedFilters, rangeStartDate: prev.rangeStartDate || today, rangeEndDate: prev.rangeEndDate || today };
      });
    }
  };

  const handleClassSelect = () => {
    setShowClassPopup(false);
  };

  const handleAddConfirm = () => {
    setShowAddPopup(false);
  };

  const handleAddCancel = () => {
    setShowAddPopup(false);
  };

  const handleDelete = (rowData) => {
    setTimeout(() => {
      if (rowData.isAdded === 'Y') {
        setData((prevData) => prevData.filter((r) => r.ID !== rowData.ID));
      } else {
        const newIsDeleted = rowData.isDeleted === 'Y' ? 'N' : 'Y';
        setData((prevData) => prevData.map((r) => r.ID === rowData.ID ? { ...r, isDeleted: newIsDeleted, isChanged: newIsDeleted === 'Y' ? 'N' : r.isChanged } : r));
      }
    }, 0);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const changedRows = data.filter((row) => (row.isDeleted === 'Y' && row.isAdded !== 'Y') || (row.isAdded === 'Y') || (row.isChanged === 'Y' && row.isDeleted === 'N'));
    if (changedRows.length === 0) {
      errorMsgPopup('변경된 데이터가 없습니다.');
      return;
    }
    setLoading(true);
    try {
      msgPopup('모든 변경사항이 성공적으로 저장되었습니다.');
      setData((prevData) => prevData.map((row) => ({ ...row, isDeleted: row.isDeleted === 'Y' && row.isAdded !== 'Y' ? 'Y' : 'N', isAdded: 'N', isChanged: 'N' })));
    } catch (err) {
      console.error('Save operation failed:', err);
      errorMsgPopup('저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <MainSearch config={searchConfig} filters={filters} setFilters={setFilters} onEvent={handleDynamicEvent} />
      <TableSearch filterFields={filterTableFields} filters={tableFilters} setFilters={setTableFilters} rowCount={rowCount} onDownloadExcel={() => handleDownloadExcel(tableInstance.current, tableStatus, '개별업무관리.xlsx')} buttonStyles={styles}>
        <div className={styles.btnGroupCustom}><button className={`${styles.btn} text-bg-success`} onClick={handleSave}>저장</button></div>
      </TableSearch>
      <div className={styles.tableWrapper}>
        {tableStatus === 'initializing' && <div>초기화 중...</div>}
        {loading && <div>로딩 중...</div>}
        <div ref={tableRef} className={styles.tableSection} style={{ visibility: loading || tableStatus !== 'ready' ? 'hidden' : 'visible' }} />
      </div>
      <CommonPopup show={showClassPopup} onHide={() => setShowClassPopup(false)} onConfirm={handleClassSelect} title="업무구분 데이터">
        <div className="mb-3"><strong>대분류:</strong> {class1Data.map((item) => item.CLASSANM).join(', ')}</div>
        <div className="mb-3"><strong>중분류:</strong> {class2Data.map((item) => item.CLASSBNM).join(', ')}</div>
        <div className="mb-3"><strong>소분류:</strong> {class3Data.map((item) => item.CLASSCNM).join(', ')}</div>
      </CommonPopup>
      <CommonPopup show={showAddPopup} onHide={handleAddCancel} onConfirm={handleAddConfirm} title="개별업무 등록">
        <div className="mb-3">
          <label className="form-label">대분류</label>
          <select className={`form-select ${styles.formSelect}`}>
            <option value="all">==대분류==</option>
            {class1Data.map((item) => <option key={item.CLASSACD} value={item.CLASSACD}>{item.CLASSANM}</option>)}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">중분류</label>
          <select className={`form-select ${styles.formSelect}`}>
            <option value="all">==중분류==</option>
            {class2Data.map((item) => <option key={item.CLASSBCD} value={item.CLASSBCD}>{item.CLASSBNM}</option>)}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">소분류</label>
          <select className={`form-select ${styles.formSelect}`}>
            <option value="all">==소분류==</option>
            {class3Data.map((item) => <option key={item.CLASSCCD} value={item.CLASSCCD}>{item.CLASSCNM}</option>)}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">이름</label>
          <input type="text" className={`form-control ${styles.formControl}`} placeholder="이름 입력" />
        </div>
        <div className="mb-3">
          <label className="form-label">근무형태</label>
          <select className={`form-select ${styles.formSelect}`}>
            <option value="">선택</option>
            {workTypeData.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">작업일시</label>
          <input type="date" className={`form-control ${styles.formControl}`} defaultValue={today} />
        </div>
        <div className="mb-3">
          <label className="form-label">작업시간</label>
          <input type="number" className={`form-control ${styles.formControl}`} placeholder="시간 입력" step="0.5" min="0" />
        </div>
        <div className="mb-3">
          <label className="form-label">건(구간/본/개소)</label>
          <input type="number" className={`form-control ${styles.formControl}`} placeholder="건수 입력" min="0" />
        </div>
      </CommonPopup>
    </div>
  );
};

export default StandardEmpJobManage;
import React, { useState, useEffect, useRef } from 'react';
import Modal from 'react-bootstrap/Modal';
import { createTable } from '../../../utils/tableConfig';
import { initialFilters } from '../../../utils/tableEvent';
import { handleDownloadExcel } from '../../../utils/tableExcel';
import TableSearch from '../../../components/table/TableSearch';
import { fetchData } from '../../../utils/dataUtils';
import { errorMsgPopup } from '../../../utils/errorMsgPopup';
import styles from './StandardOrgStatisticPopup.module.css';
import StandardOrgClassStatisticPopup from './StandardOrgClassStatisticPopup';

const StandardOrgStatisticPopup = ({ show, onHide, data, dynamicColumns }) => {
  const tableRef = useRef(null);
  const tableInstance = useRef(null);
  const [filters, setFilters] = useState(
    initialFilters([
      {
        id: 'filterSelect',
        label: '',
        type: 'select',
        options: [
          { value: '', label: '선택' },
          { value: 'ORGNM', label: '조직' },
        ],
      },
      {
        id: 'filterText',
        label: '',
        type: 'text',
        placeholder: '검색값을 입력하세요',
        width: '200px',
      },
    ])
  );
  const [tableStatus, setTableStatus] = useState('initializing');
  const [rowCount, setRowCount] = useState(0);
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showClassStatisticPopup, setShowClassStatisticPopup] = useState(false);
  const [selectedClassData, setSelectedClassData] = useState(null);

  // 기본 컬럼 정의 (StandardOrgStatistic.jsx와 동일)
  const baseColumns = [
    { headerHozAlign: 'center', hozAlign: 'center', title: 'No', field: 'ID', sorter: 'number', width: 60, frozen: true },
    { headerHozAlign: 'center', hozAlign: 'center', title: '업무분야코드', field: 'SECTIONCD', sorter: 'string', width: 100, visible: false },
    { headerHozAlign: 'center', hozAlign: 'center', title: '업무분야', field: 'SECTIONNM', sorter: 'string', width: 100 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '인원', field: 'EMPNOCNT', sorter: 'number', width: 100 },
    {
      headerHozAlign: 'center',
      hozAlign: 'center',
      title: '조직',
      field: 'ORGNM',
      sorter: 'string',
      width: 130,
      formatter: (cell) => {
        const value = cell.getValue();
        if (value) {
          cell.getElement().style.color = '#247db3';
          cell.getElement().style.cursor = 'pointer';
        } else {
          cell.getElement().style.color = '#000000';
          cell.getElement().style.cursor = 'default';
        }
        return value || '';
      },
      cellClick: (e, cell) => {
        const value = cell.getValue();
        const rowData = cell.getRow().getData();
        if (value) {
          setSelectedClassData({
            ...rowData,
            SECTIONCD: rowData.SECTIONCD || '',
            EMPNO: rowData.EMPNO || '',
            ORGCD: rowData.ORGCD || '',
            ORGLEVELGB: rowData.pORGLEVELGB || '',
            DATEGB: rowData.pDATEGB || '',
            DATE1: rowData.pDATE1 || '',
            DATE2: rowData.pDATE2 || '',
            CLASSCD: rowData.CLASSCD || '',
          });
          setShowClassStatisticPopup(true);
        }
      },
    },
    { headerHozAlign: 'center', hozAlign: 'center', title: '조직코드', field: 'ORGCD', sorter: 'string', width: 130, visible: false },
    { headerHozAlign: 'center', hozAlign: 'center', title: '조회일자구분', field: 'pDATEGB', sorter: 'string', width: 100, visible: false },
    { headerHozAlign: 'center', hozAlign: 'center', title: '조회일자1', field: 'pDATE1', sorter: 'string', width: 100, visible: false },
    { headerHozAlign: 'center', hozAlign: 'center', title: '조회일자2', field: 'pDATE2', sorter: 'string', width: 100, visible: false },
    { headerHozAlign: 'center', hozAlign: 'center', title: '조회조직레벨구분', field: 'pORGLEVELGB', sorter: 'string', width: 100, visible: false },
  ];

  // 테이블 초기화
  useEffect(() => {
    if (!show || !tableRef.current) return;

    let isMounted = true;

    const initializeTable = async () => {
      if (tableInstance.current) {
        tableInstance.current.destroy();
        tableInstance.current = null;
      }
      try {
        tableInstance.current = createTable(tableRef.current, baseColumns, [], {
          layout: 'fitColumns',
        });

        if (!tableInstance.current) throw new Error('createTable returned undefined or null');

        tableInstance.current.on('tableBuilt', () => {
          if (isMounted) setTableStatus('ready');
        });
      } catch (err) {
        if (isMounted) setTableStatus('error');
        console.error('Table initialization failed:', err.message);
      }
    };

    initializeTable();

    return () => {
      isMounted = false;
      if (tableInstance.current) {
        tableInstance.current.destroy();
        tableInstance.current = null;
        setTableStatus('initializing');
      }
    };
  }, [show]);

  // 데이터 로드
  useEffect(() => {
    if (!show) return;
    let isMounted = true;

    const loadData = async () => {
      if (!data || !Array.isArray(data) || data.length === 0 || !data[0]) {
        if (isMounted) {
          setTableData([]);
          setHasSearched(false);
          setLoading(false);
        }
        return;
      }

      if (isMounted && !loading) {
        setLoading(true);
        setHasSearched(true);
      }

      try {
        // let orgLevel = data[0].ORGLEVELGB || '';

        // // orgLevel 값이 숫자 형식이라면 1을 더하고, 아닐 경우 기본값으로 처리
        // if (orgLevel !== '') {
        //   let numLevel = Number(orgLevel);
        //   if (!isNaN(numLevel)) {
        //     orgLevel = (numLevel + 1).toString();
        //   }
        // } else {
        //   orgLevel = '';
        // }

        // console.log(orgLevel);

        const params = {
          pGUBUN: 'LIST',
          pSECTIONCD: data[0].SECTIONCD || '',
          pEMPNO: data[0].EMPNO || '',
          pORGCD: data[0].ORGCD || '',
          pORGLEVELGB: data[0].ORGLEVEL || '',
          pDATEGB: data[0].DATEGB || '',
          pDATE1: data[0].DATE1 || '',
          pDATE2: data[0].DATE2 || '',
          pCLASSCD: data[0].CLASSCD || '',
          pDEBUG: 'F',
        };

        // 메인 데이터 로드 (LIST)
        const response = await fetchData('standard/orgStatistic/list', params);

        if (!response.success && isMounted) {
          errorMsgPopup(response.message || '데이터를 가져오는 중 오류가 발생했습니다.');
          setTableData([]);
          return;
        }

        const responseData = Array.isArray(response.data)
          ? response.data.map((row, index) => ({
              ...row,
              ID: index + 1,
            }))
          : [];

        if (isMounted) setTableData(responseData);
      } catch (err) {
        console.error('데이터 로드 실패:', err);
        if (isMounted) {
          errorMsgPopup('데이터를 가져오는 중 오류가 발생했습니다.');
          setTableData([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [show, JSON.stringify(data)]);

  // 테이블 데이터 및 컬럼 반영
  useEffect(() => {
    if (!tableInstance.current || tableStatus !== 'ready' || loading) return;

    try {
      const updatedColumns = [...baseColumns, ...dynamicColumns];
      tableInstance.current.setColumns(updatedColumns);
      tableInstance.current.setData(tableData);
      setRowCount(tableInstance.current.getDataCount());

      if (hasSearched && tableData.length === 0) {
        tableInstance.current.alert('검색 결과 없음', 'info');
      } else {
        tableInstance.current.clearAlert();
      }
    } catch (err) {
      console.warn('setData 호출 시점 문제:', err.message);
    }
  }, [tableData, tableStatus, loading, hasSearched, dynamicColumns]);

  // 필터 적용
  useEffect(() => {
    if (!tableInstance.current || tableStatus !== 'ready' || loading) return;

    const { filterSelect, filterText } = filters;
    try {
      if (filterText && filterSelect) {
        tableInstance.current.setFilter(filterSelect, 'like', filterText);
      } else if (filterText) {
        tableInstance.current.setFilter([{ field: 'ORGNM', type: 'like', value: filterText }], 'or');
      } else {
        tableInstance.current.clearFilter();
      }
      setRowCount(tableInstance.current.getDataCount());
    } catch (err) {
      console.error('필터 적용 실패:', err);
    }
  }, [filters, tableStatus, loading]);

  const onDownloadExcel = () => {
    handleDownloadExcel(tableInstance.current, tableStatus, '조직별현황.xlsx');
  };

  const handleClose = () => {
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered dialogClassName={styles.customModal}>
      <Modal.Header closeButton>
        <Modal.Title>조직별 현황</Modal.Title>
      </Modal.Header>
      <Modal.Body className={`${styles.modalBody} modal-body`}>
        <TableSearch
          filterFields={[
            {
              id: 'filterSelect',
              label: '',
              type: 'select',
              options: [
                { value: '', label: '선택' },
                { value: 'ORGNM', label: '조직' },
              ],
            },
            {
              id: 'filterText',
              label: '',
              type: 'text',
              placeholder: '검색값을 입력하세요',
              width: '200px',
            },
          ]}
          filters={filters}
          setFilters={setFilters}
          rowCount={rowCount}
          onDownloadExcel={onDownloadExcel}
          buttonStyles={styles}
        />
        {tableStatus === 'initializing' && <div>초기화 중...</div>}
        {loading && <div>로딩 중...</div>}
        <div
          ref={tableRef}
          className={styles.tableSection}
          style={{ height: '300px', visibility: loading || tableStatus !== 'ready' ? 'hidden' : 'visible' }}
        />
        <div className={styles.inputButtonWrapper}>
          <button className={`btn text-bg-secondary`} onClick={handleClose}>
            닫기
          </button>
        </div>
      </Modal.Body>
      <StandardOrgClassStatisticPopup
        show={showClassStatisticPopup}
        onHide={() => setShowClassStatisticPopup(false)}
        data={selectedClassData ? [selectedClassData] : []}
      />
    </Modal>
  );
};

export default StandardOrgStatisticPopup;
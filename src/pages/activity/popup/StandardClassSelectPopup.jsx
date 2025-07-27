import React, { useState, useEffect, useRef } from 'react';
import Modal from 'react-bootstrap/Modal';
import { createTable } from '../../../utils/tableConfig';
import styles from './StandardClassSelectPopup.module.css';

const StandardClassSelectPopup = ({ show, onHide, onSelect, data }) => {
  const tableRef = useRef(null);
  const tableInstance = useRef(null);
  const [_selectedRow, setSelectedRow] = useState(null);

  useEffect(() => {
    if (show && data && Array.isArray(data)) {
      const groupedData = data.reduce((acc, item) => {
        const key = `${item.CLASSACD}-${item.CLASSBCD}`;
        if (!acc[key]) {
          acc[key] = { CLASSACD: item.CLASSACD, CLASSANM: item.CLASSANM, CLASSBCD: item.CLASSBCD, CLASSBNM: item.CLASSBNM, minorNames: [] };
        }
        acc[key].minorNames.push({ CLASSCCD: item.CLASSCCD, CLASSCNM: item.CLASSCNM });
        return acc;
      }, {});

      const uniqueData = Object.values(groupedData).map((item, index) => ({
        ID: index,
        CLASSANM: item.CLASSANM,
        CLASSBNM: item.CLASSBNM,
        CLASSCNM: item.minorNames.map((m) => m.CLASSCNM).join(', ') || '',
      }));

      const columns = [
        { title: '대분류', field: 'CLASSANM', hozAlign: 'left', width: 150 },
        { title: '중분류', field: 'CLASSBNM', hozAlign: 'left', width: 150 },
        { title: '소분류', field: 'CLASSCNM', hozAlign: 'left' },
      ];

      if (tableRef.current && !tableInstance.current) {
        tableInstance.current = createTable(tableRef.current, columns, uniqueData, {
          layout: 'fitColumns',
        });

        if (tableInstance.current) {
          tableInstance.current.on('rowClick', (e, row) => {
            const rowData = row.getData();
            setSelectedRow(rowData);
            const fullData = data.find(
              (item) => item.CLASSANM === rowData.CLASSANM && item.CLASSBNM === rowData.CLASSBNM
            );
            if (onSelect && typeof onSelect === 'function') {
              onSelect({
                major: fullData?.CLASSACD || '',
                middle: fullData?.CLASSBCD || '',
                minor: fullData?.CLASSCCD || '',
              });
            }

            if (onHide && typeof onHide === 'function') {
              onHide();
            }
          });
        }
      } else if (tableInstance.current) {
        tableInstance.current.setData(uniqueData);
      }
    }
    return () => {
      if (tableInstance.current) {
        tableInstance.current.destroy();
        tableInstance.current = null;
      }
    };
  }, [show, data, onHide, onSelect]);

  return (
    <Modal show={show} onHide={onHide} centered dialogClassName={styles.customModal}>
      <Modal.Header closeButton>
        <Modal.Title>분류 선택</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div ref={tableRef} className={styles.tableSection} style={{ height: '300px'}} />
      </Modal.Body>
    </Modal>
  );
};

export default StandardClassSelectPopup;
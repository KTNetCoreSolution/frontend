import React from 'react';
import { handleInputChange } from '../../utils/tableEvent';
import "tabulator-tables/dist/css/tabulator.min.css";
import '../../assets/css/tabulatorGlobal.css';
import styles from './TableSearch.module.css';
import TableTitle from './TableTitle'; // Import the new TableTitle component
import { fi } from 'date-fns/locale';

const TableSearch = ({ filterFields, filters, setFilters, onDownloadExcel, children, buttonStyles, rowCount, excelYn }) => {
  return (
    <div>
      <div className={styles.searchSection}>
        <div className={styles.formGroupContainer}>
          {filterFields.map((field) => (
            <div id={field.divid} key={field.id} className={styles.formGroup} style={{display: field.display}}>
              <label htmlFor={field.id}>{field.label}</label>
              {field.type === 'text' ? (
                <input
                  id={field.id}
                  name={field.id}
                  type="text"
                  placeholder={field.placeholder}
                  value={filters[field.id] || ''}
                  onChange={(e) => handleInputChange(e, setFilters)}
                  style={{
                    width: field.width || 'auto',
                    height: field.height || 'auto',            
                  }}
                  disabled={field.disabled || ''}
                />
              ) : field.type === 'select' ? (
                <select
                  id={field.id}
                  name={field.id}
                  value={filters[field.id] || ''}
                  onChange={(e) => handleInputChange(e, setFilters)}
                  style={{
                    width: field.width || 'auto',
                    height: field.height || 'auto',
                  }}
                  disabled={field.disabled || ''}
                >
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          ))}
          {children && <div className={buttonStyles?.btnGroupCustom}>{children}</div>}
        </div>
        <div className={styles.buttonContainer} style={{display: excelYn === 'N' ? 'none' : 'flex'}}>
          <button onClick={onDownloadExcel} className={styles.downloadButton}>
            엑셀 다운로드
          </button>
        </div>
      </div>
      <div className={styles.tableTitleRow}>
        <TableTitle rowCount={rowCount || 0} />
      </div>
    </div>
  );
};

export default TableSearch;
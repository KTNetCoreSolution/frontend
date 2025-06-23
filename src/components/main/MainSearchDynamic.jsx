import React, { useEffect } from 'react';
import { handleInputChange } from '../../utils/tableEvent';
import DatePickerCommon from '../common/DatePickerCommon';
import common from '../../utils/common';
import { errorMsgPopup } from '../../utils/errorMsgPopup';
import styles from './MainSearchDynamic.module.css';

/**
 * 동적 검색 폼 컴포넌트
 * @param {Object} props - 컴포넌트 속성
 * @param {Object} config - 검색 필드 및 버튼 구성
 * @param {Object} filters - 현재 필터 상태
 * @param {Function} setFilters - 필터 상태 업데이트 함수
 * @param {Function} onEvent - 이벤트 핸들러
 */
const MainSearchDynamic = ({ config, filters, setFilters, onEvent }) => {
  const defaultStyles = {
    width: '150px',
    height: '30px',
    backgroundColor: '#ffffff',
    color: '#000000',
  };
  const defaultMaxLength = 255;

  const today = new Date();
  const todayDate = today.toISOString().split('T')[0];
  const todayMonth = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;

  const getStyleValue = (value, defaultValue) => value === 'default' || !value ? defaultValue : value;

  useEffect(() => {
    const searchFields = config.areas.find((area) => area.type === 'search')?.fields || [];
    const initialDateFilters = {};
    searchFields.forEach((field) => {
      if (['day', 'startday', 'endday'].includes(field.type) && filters[field.id] === undefined) {
        initialDateFilters[field.id] = field.defaultValue || todayDate;
      } else if (['startmonth', 'endmonth'].includes(field.type) && filters[field.id] === undefined) {
        initialDateFilters[field.id] = field.defaultValue || todayMonth;
      } else if (['dayperiod', 'monthperiod'].includes(field.type) && filters[field.id] === undefined) {
        initialDateFilters[field.id] = field.defaultValue || {
          start: field.type === 'dayperiod' ? todayDate : todayMonth,
          end: field.type === 'dayperiod' ? todayDate : todayMonth,
        };
      }
    });
    if (Object.keys(initialDateFilters).length > 0) {
      console.log('Setting initial date filters:', initialDateFilters);
      setFilters((prevFilters) => ({
        ...prevFilters,
        ...initialDateFilters,
      }));
    }
  }, [config, filters, setFilters]);

  const handleChangeWithValidation = (e, field) => {
    const { id, maxLength, type } = field;
    let value = e.target?.value ?? e;

    if (type === 'text' || type === 'textarea') {
      const validationResult = common.validateVarcharLength(value, maxLength || defaultMaxLength, field.label || '입력값');
      if (!validationResult.valid) {
        errorMsgPopup(validationResult.error);
        return;
      }
    }

    console.log(`Updating filter: ${id} = ${JSON.stringify(value)}`);
    setFilters((prevFilters) => {
      const newFilters = { ...prevFilters, [id]: value };
      console.log('New filters:', newFilters);
      return newFilters;
    });

    if (field.event) {
      onEvent(field.event, { id, value });
    } else if (type === 'select') {
      onEvent('selectChange', { id, value });
    }
  };

  const handleCheckboxChange = (e, field) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      [field.id]: e.target.checked,
    }));
    if (field.event) {
      onEvent(field.event, { id: field.id, checked: e.target.checked });
    }
  };

  const handleRadioChange = (e, field) => {
    handleInputChange(e, setFilters);
    if (field.event) {
      onEvent(field.event, { id: field.id, value: e.target.value });
    }
  };

  const handleResetDate = (field) => {
    const { id, type } = field;
    let newFilters = {};
    if (id === 'rangeEndDate') {
      newFilters = { rangeStartDate: todayDate, rangeEndDate: todayDate };
    } else if (id === 'rangeEndMonth') {
      newFilters = { rangeStartMonth: todayMonth, rangeEndMonth: todayMonth };
    } else if (['dayperiod', 'monthperiod'].includes(type)) {
      newFilters[id] = {
        start: type === 'dayperiod' ? todayDate : todayMonth,
        end: type === 'dayperiod' ? todayDate : todayMonth,
      };
    } else {
      newFilters[id] = type === 'startmonth' || type === 'endmonth' ? todayMonth : todayDate;
    }
    setFilters((prevFilters) => ({
      ...prevFilters,
      ...newFilters,
    }));
    onEvent('dateChange', { id, value: newFilters[id] || Object.values(newFilters)[0] });
  };

  const getDateConstraints = (field) => {
    if (field.type === 'startday' && filters.rangeEndDate) {
      return { maxDate: filters.rangeEndDate };
    }
    if (field.type === 'endday' && filters.rangeStartDate) {
      return { minDate: filters.rangeStartDate };
    }
    if (field.type === 'startmonth' && filters.rangeEndMonth) {
      return { maxDate: filters.rangeEndMonth };
    }
    if (field.type === 'endmonth' && filters.rangeStartMonth) {
      return { minDate: filters.rangeStartMonth };
    }
    return {};
  };

  const renderRows = () => {
    const searchFields = config.areas.find((area) => area.type === 'search')?.fields || [];
    const buttonFields = config.areas.find((area) => area.type === 'buttons')?.fields || [];

    const rows = {};
    searchFields.forEach((field) => {
      const row = field.row || 1;
      if (!rows[row]) rows[row] = { search: [], buttons: [] };
      rows[row].search.push(field);
    });

    buttonFields.forEach((button) => {
      const row = button.row || 1;
      if (!rows[row]) rows[row] = { search: [], buttons: [] };
      rows[row].buttons.push(button);
    });

    return Object.keys(rows).map((rowIndex) => (
      <div key={`row-${rowIndex}`} className={styles.formGroupContainer}>
        <div className={styles.searchFields}>
          {rows[rowIndex].search.map((field) => (
            <div key={field.id} className={styles.formGroup}>
              {(field.labelVisible !== false && field.label) && <label htmlFor={field.id}>{field.label}:</label>}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                {(field.type === 'text' || field.type === 'textarea') && (
                  field.type === 'text' ? (
                    <input
                      id={field.id}
                      name={field.id}
                      type="text"
                      placeholder={field.placeholder || ''}
                      value={filters[field.id] || ''}
                      onChange={(e) => handleChangeWithValidation(e, field)}
                      style={{
                        width: getStyleValue(field.width, defaultStyles.width),
                        height: getStyleValue(field.height, defaultStyles.height),
                        backgroundColor: getStyleValue(field.backgroundColor, defaultStyles.backgroundColor),
                        color: getStyleValue(field.color, defaultStyles.color),
                        boxSizing: 'border-box',
                        margin: 0,
                      }}
                      disabled={field.enabled === false}
                    />
                  ) : (
                    <textarea
                      id={field.id}
                      name={field.id}
                      placeholder={field.placeholder || ''}
                      value={filters[field.id] || ''}
                      onChange={(e) => handleChangeWithValidation(e, field)}
                      style={{
                        width: getStyleValue(field.width, defaultStyles.width),
                        height: getStyleValue(field.height, defaultStyles.height),
                        backgroundColor: getStyleValue(field.backgroundColor),
                        color: getStyleValue(field.color, defaultStyles.color),
                        boxSizing: 'border-box',
                        margin: 0,
                      }}
                      disabled={field.enabled === false}
                    />
                  )
                )}
                {['day', 'startday', 'endday', 'startmonth', 'endmonth', 'dayperiod', 'monthperiod'].includes(field.type) && (
                  <div style={{
                    width: getStyleValue(field.width, defaultStyles.width),
                    height: getStyleValue(field.height, defaultStyles.height),
                    display: 'flex',
                    alignItems: 'center',
                  }}>
                    <DatePickerCommon
                      id={field.id}
                      type={field.type}
                      value={filters[field.id]}
                      onChange={(e) => handleChangeWithValidation(e, field)}
                      placeholder={field.placeholder || field.label || ''}
                      width="100%"
                      height="100%"
                      backgroundColor={field.backgroundColor}
                      color={field.color}
                      enabled={field.enabled}
                      {...getDateConstraints(field)}
                    />
                    <button
                      className="btn btn-link p-0 ms-2"
                      onClick={() => handleResetDate(field)}
                      title="초기화"
                      style={{ lineHeight: '1' }}
                    >
                      <i className="bi bi-x-square fs-6"></i>
                    </button>
                  </div>
                )}
                {field.type === 'select' && (
                  <select
                    id={field.id}
                    name={field.id}
                    value={filters[field.id] || ''}
                    onChange={(e) => handleChangeWithValidation(e, field)}
                    style={{
                      width: getStyleValue(field.width, defaultStyles.width),
                      height: getStyleValue(field.height, defaultStyles.height),
                      backgroundColor: getStyleValue(field.backgroundColor, defaultStyles.backgroundColor),
                      color: getStyleValue(field.color, defaultStyles.color),
                      boxSizing: 'border-box',
                      margin: 0,
                    }}
                    disabled={field.enabled === false}
                  >
                    {field.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
                {field.type === 'radio' && (
                  <div className={styles.radioGroup}>
                    {field.options.map((option) => (
                      <label key={option.value} className={styles.radioLabel}>
                        <input
                          type="radio"
                          name={field.id}
                          value={option.value}
                          checked={filters[field.id] === option.value}
                          onChange={(e) => handleRadioChange(e, field)}
                          disabled={field.enabled === false}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                )}
                {field.type === 'checkbox' && (
                  <input
                    type="checkbox"
                    id={field.id}
                    name={field.id}
                    checked={filters[field.id] || false}
                    onChange={(e) => handleCheckboxChange(e, field)}
                    disabled={field.enabled === false}
                  />
                )}
                {field.type === 'popupIcon' && (
                  <button
                    className={styles.popupIcon}
                    onClick={() => onEvent('popupIconClick', { id: field.id })}
                    style={{
                      width: getStyleValue(field.width, defaultStyles.width),
                      height: getStyleValue(field.height, defaultStyles.height),
                      backgroundColor: getStyleValue(field.backgroundColor, defaultStyles.backgroundColor),
                      color: getStyleValue(field.color, defaultStyles.color),
                      boxSizing: 'border-box',
                      margin: 0,
                    }}
                    disabled={field.enabled === false}
                  >
                    +
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        {rows[rowIndex].buttons.length > 0 && (
          <div className={styles.buttonContainer}>
            {rows[rowIndex].buttons.map((button) => (
              <button
                key={button.id}
                onClick={() => onEvent(button.eventType, { id: button.id })}
                style={{
                  width: getStyleValue(button.width, '80px'),
                  height: getStyleValue(button.height, '30px'),
                  backgroundColor: getStyleValue(button.backgroundColor, '#00c4b4'),
                  color: getStyleValue(button.color, '#ffffff'),
                  boxSizing: 'border-box',
                  margin: 0,
                }}
                disabled={button.enabled === false}
              >
                {button.label}
              </button>
            ))}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className={styles.searchSection}>
      {renderRows()}
    </div>
  );
};

export default MainSearchDynamic;
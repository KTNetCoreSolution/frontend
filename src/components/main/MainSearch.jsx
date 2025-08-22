import React, { useEffect } from 'react';
import { handleInputChange } from '../../utils/tableEvent';
import DatePickerCommon from '../common/DatePickerCommon';
import common from '../../utils/common';
import { errorMsgPopup } from '../../utils/errorMsgPopup';
import styles from './MainSearch.module.css';

/**
 * 동적 검색 폼 컴포넌트
 * @param {Object} props - 컴포넌트 속성
 * @param {Object} config - 검색 필드 및 버튼 구성
 * @param {Object} filters - 현재 필터 상태
 * @param {Function} setFilters - 필터 상태 업데이트 함수
 * @param {Function} onEvent - 이벤트 핸들러
 */
const MainSearch = ({ config, filters, setFilters, onEvent }) => {
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

  // 필터 초기화: 모든 필드의 defaultValue 설정, 날짜 및 월 관련 필드의 기본값 설정
  useEffect(() => {
    const searchFields = config.areas.find((area) => area.type === 'search')?.fields || [];
    const initialFilters = {};
    searchFields.forEach((field) => {
      if (filters[field.id] === undefined) {
        if (['day', 'startday', 'endday'].includes(field.type)) {
          initialFilters[field.id] = field.defaultValue || todayDate;
        } else if (['startmonth', 'endmonth', 'month'].includes(field.type)) {
          initialFilters[field.id] = field.defaultValue 
            ? (field.defaultValue.includes('-') ? field.defaultValue.substring(0, 7) : todayMonth) 
            : todayMonth;
        } else if (['dayperiod', 'monthperiod'].includes(field.type)) {
          initialFilters[field.id] = field.defaultValue || {
            start: field.type === 'dayperiod' ? todayDate : todayMonth,
            end: field.type === 'dayperiod' ? todayDate : todayMonth,
          };
        } else if (field.defaultValue !== undefined) {
          // text, textarea, select, radio, checkbox, popupIcon, button, label 등 다른 필드에 대한 defaultValue 적용
          initialFilters[field.id] = field.defaultValue;
        }
      }
    });
    if (Object.keys(initialFilters).length > 0) {
      setFilters((prevFilters) => ({
        ...prevFilters,
        ...initialFilters,
      }));
    }
  }, [config, filters, setFilters]);

  const handleChangeWithValidation = (e, field) => {
    const { id, maxLength, type, enabled } = field;
    let value = e.target?.value ?? e;

    // 날짜 관련 필드는 enabled=false라도 허용
    if (enabled === false && !['day', 'startday', 'endday', 'startmonth', 'endmonth', 'month', 'dayperiod', 'monthperiod'].includes(type)) {
      return;
    }

    if (type === 'text' || type === 'textarea') {
      const validationResult = common.validateVarcharLength(value, maxLength || defaultMaxLength, field.label || '입력값');
      if (!validationResult.valid) {
        errorMsgPopup(validationResult.error);
        return;
      }
    }

    setFilters((prevFilters) => ({ ...prevFilters, [id]: value }));

    if (field.event) {
      onEvent(field.event, { id, value });
    } else if (type === 'select') {
      onEvent('selectChange', { id, value });
    } else if (['day', 'startday', 'endday', 'startmonth', 'endmonth', 'month', 'dayperiod', 'monthperiod'].includes(type)) {
      onEvent('dateChange', { id, value }); // 날짜 선택 이벤트 트리거
    }
  };

  const handleCheckboxChange = (e, field) => {
    if (field.enabled === false) return; // enabled: false일 때 동작 차단
    setFilters((prevFilters) => ({
      ...prevFilters,
      [field.id]: e.target.checked,
    }));
    if (field.event) {
      onEvent(field.event, { id: field.id, checked: e.target.checked });
    }
  };

  const handleRadioChange = (e, field) => {
    if (field.enabled === false) return; // enabled: false일 때 동작 차단
    handleInputChange(e, setFilters);
    if (field.event) {
      onEvent(field.event, { id: field.id, value: e.target.value });
    }
  };

  const handleResetDate = (field) => {
    if (field.enabled === false) return; // enabled: false일 때 동작 차단
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
      newFilters[id] = type === 'startmonth' || type === 'endmonth' || type === 'month' ? todayMonth : todayDate;
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
    if (field.type === 'month') {
      return {};
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
              {(field.labelVisible !== false && field.label && field.type !== 'label') && <label htmlFor={field.id}>{field.label}</label>}
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
                      readOnly={!field.enabled}
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
                        backgroundColor: getStyleValue(field.backgroundColor, defaultStyles.backgroundColor),
                        color: getStyleValue(field.color, defaultStyles.color),
                        boxSizing: 'border-box',
                        margin: 0,
                      }}
                      readOnly={!field.enabled}
                    />
                  )
                )}
                {['day', 'startday', 'endday', 'startmonth', 'endmonth', 'month', 'dayperiod', 'monthperiod'].includes(field.type) && (
                  <div style={{
                    width: getStyleValue(field.width, defaultStyles.width),
                    height: getStyleValue(field.height, defaultStyles.height),
                    display: 'flex',
                    alignItems: 'center',
                  }}>
                    <DatePickerCommon
                      id={field.id}
                      type={field.type === 'month' ? 'startmonth' : field.type}
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
                      disabled={field.enabled === false}
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
                    readOnly={!field.enabled}
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
                    onClick={() => onEvent(field.eventType, { id: field.id })}
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
                {field.type === 'button' && (
                  <button
                    id={field.id}
                    onClick={() => onEvent(field.eventType, { id: field.id })}
                    style={{
                      width: getStyleValue(field.width, '80px'),
                      height: getStyleValue(field.height, '30px'),
                      backgroundColor: getStyleValue(field.backgroundColor, '#00c4b4'),
                      color: getStyleValue(field.color, '#ffffff'),
                      boxSizing: 'border-box',
                      margin: 0,
                      border: 'none',
                      borderRadius: '4px',
                      cursor: field.enabled ? 'pointer' : 'not-allowed',
                    }}
                    disabled={field.enabled === false}
                  >
                    {field.label}
                  </button>
                )}
                {field.type === 'label' && (
                  <span
                    style={{
                      width: getStyleValue(field.width, defaultStyles.width),
                      height: getStyleValue(field.height, defaultStyles.height),
                      color: getStyleValue(field.color, defaultStyles.color),
                      display: 'inline-block',
                      lineHeight: getStyleValue(field.height, defaultStyles.height),
                      boxSizing: 'border-box',
                      margin: 0,
                    }}
                  >
                    {field.label}
                  </span>
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
    <div className="searchSection">
      {renderRows()}
    </div>
  );
};

export default MainSearch;
import React, { useState, useEffect, useRef } from 'react';
import Select from 'react-select';
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
    // width: '150px',
    // height: '30px',
    // backgroundColor: '#ffffff',
    // color: '#000000',
  };
  const defaultMaxLength = 255;

  const todayDate = common.getTodayDate();
  const todayMonth = common.getTodayMonth();

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
        } else if (field.type === 'multiselect' && filters[field.id] === undefined) {
          initialFilters[field.id] = field.defaultValue || [];// multiSelected 상태에도 초기화
          
          if (!multiSelected[field.id]) {
            setMultiSelected(prev => ({
              ...prev,
              [field.id]: (field.options || []).filter(opt => 
                filters[field.id]?.includes(opt.value)
              )
            }));
          }
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

  // 여기부터 multiselect 관련 로직
  const [multiSelected, setMultiSelected] = useState({})
  const handleMultiChange = (fieldId) => (newValue) => {
    const updated = newValue || [];    
    setMultiSelected(prev => ({
      ...prev,
      [fieldId]: updated
    }));

    // filters에도 값 저장
    setFilters(prev => ({
      ...prev,
      [fieldId]: updated.map(item => item.value)   // value 배열로 저장
    }));

    // 부모 컴포넌트에 이벤트 전달
    if (onEvent) {
      onEvent('multiselectChange', {
        id: fieldId,
        values: updated.map(item => item.value),
        labels: updated.map(item => item.label),
        options: updated
      });
    }
  };

  // 선택된 값 표시용 함수
  const getDisplayValue = (fieldId) => {
    const selected = multiSelected[fieldId] || [];
    if (selected.length === 0) return '';
    if (selected.length === 1) return selected[0].label;
    return `${selected[0].label} 외 ${selected.length - 1}개`;
  };

  // CustomOption
  const CustomOption = (props) => {
    const { data, isSelected, innerRef, innerProps } = props;
    return (
      <div
        ref={innerRef}
        {...innerProps}
        style={{
          paddingLeft: '8px',
          paddingTop: '4px',
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => {}}
          style={{ marginRight: '4px' }}
        />
        {data.label}
      </div>
    );
  };

  // CustomValueContainer
  const CustomValueContainer = (props) => {
    const { children, ...rest } = props;
    const fieldId = rest.selectProps?.name || rest.selectProps?.inputId?.split('-')[0]; 
    const displayValue = getDisplayValue(fieldId);

    return (
      <div>
        {displayValue ? (
          <div>
            {displayValue}
          </div>
        ) : (
          children
        )}
      </div>
    );
  };

  // ==================== cascading clear (filters + multiSelected) ====================
  const prevFiltersRef = useRef(filters);

  useEffect(() => {
    if (!filters || !config?.areas || !setFilters) return;

    const currentFiltersStr = JSON.stringify(filters);
    const prevFiltersStr = JSON.stringify(prevFiltersRef.current);

    // filters가 실제로 변경된 경우에만 실행
    if (currentFiltersStr === prevFiltersStr) return;

    const searchFields = config.areas
      .find((area) => area.type === 'search')?.fields || [];

    const cascadingFields = searchFields
      .filter((field) => field.type === 'multiselect' && field.cascading === true)
      .sort((a, b) => (a.row || 0) - (b.row || 0));

    const fieldsToClear = [];

    for (let i = 0; i < cascadingFields.length; i++) {
      const field = cascadingFields[i];
      const value = filters[field.id];

      if (!value || (Array.isArray(value) && value.length === 0)) {
        for (let j = i + 1; j < cascadingFields.length; j++) {
          const childId = cascadingFields[j].id;
          if (filters[childId] && (Array.isArray(filters[childId]) ? filters[childId].length > 0 : true)) {
            fieldsToClear.push(childId);
          }
        }
        break;
      }
    }

    if (fieldsToClear.length > 0) {
      setFilters((prevFilters) => {
        const newFilters = { ...prevFilters };
        fieldsToClear.forEach((id) => {
          newFilters[id] = [];
        });
        return newFilters;
      });

      setMultiSelected((prevMulti) => {
        const newMulti = { ...prevMulti };
        fieldsToClear.forEach((id) => {
          newMulti[id] = [];
        });
        return newMulti;
      });
    }

    prevFiltersRef.current = filters;
  }, [filters, config, setFilters]);

  const multiSelectStyles = (field) => ({
    control: (provided, state) => ({
      ...provided,
      width: getStyleValue(field.width, defaultStyles.width),
      minWidth: getStyleValue(field.width, defaultStyles.width),
      height: getStyleValue(field.height, defaultStyles.height),
      minHeight: getStyleValue(field.height, defaultStyles.height),
      paddingLeft: '6px',
      fontSize: '15px',
      fontFamily: 'kt',
      borderColor: state.isFocused ? '#000' : '#ced4da',
      boxShadow: state.isFocused ? '0 0 0 1.1px #000' : 'none',
      '&:hover': {
        borderColor: '0 0 0 1.1px #000',
      },
    }),

    menu: (provided) => ({
      ...provided,
      zIndex: 9999,
      fontSize: '15px',
      fontFamily: 'kt',
      marginTop: '1px',
      marginBottom: '1px',
    }),

    placeholder: (provided) => ({
      ...provided,
      position: 'relative',
      marginTop: '6px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      flexShrink: 1,
      zIndex: 2,
      color: '#6c757d',
      fontSize: '14px',
      fontFamily: 'kt',
    }),

    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#e3f2fd': state.isFocused ? '#f8f9fa': 'white',
      color: '#333',
      padding: '10px 12px',
      cursor: 'pointer',
    }),

    clearIndicator: (provided) => ({
      ...provided,
      padding: '0',
      color: '#333',
      cursor: 'pointer'
    }),

    indicatorSeparator: (provided) => ({
      ...provided,
      display: 'none',
    }),
    
    indicatorsContainer: (provided) => ({
      ...provided,
      position: 'absolute',
      right: '2px',
      top: '55%',
      transform: 'translateY(-50%)',
      display: 'flex',
      alignItems: 'center',
      zIndex: 10,
      pointerEvents: 'auto',
    }),

    dropdownIndicator: (provided) => ({
      ...provided,
      padding: '2px',
      color: '#333',
    }),
  });

  // multiselect 관련 로직 끝
  
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
      <div key={`row-${rowIndex}`} className='formGroupContainer'>
        <div className='searchFields'>
          {rows[rowIndex].search.map((field) => (
            <div key={field.id} className='formGroup'>
              {(field.labelVisible !== false && field.label && field.type !== 'label') && <label htmlFor={field.id}>{field.label}</label>}
              <div>
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
                        // boxSizing: 'border-box',
                        // margin: 0,
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
                     {/*
                    <button
                      className="btn btn-link p-0 ms-2"
                      onClick={() => handleResetDate(field)}
                      title="초기화"
                      style={{ lineHeight: '1' }}
                      disabled={field.enabled === false}
                    >
                      <i className="bi bi-x-square fs-6"></i>
                    </button>
                    */}
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
                    className='popupIcon'
                    onClick={() => onEvent(field.eventType, { id: field.id })}
                    disabled={field.enabled === false}
                  >
                    <i className="bi bi-plus"></i>
                  </button>
                )}
                {field.type === 'button' && (
                  <button
                    id={field.id}
                    onClick={() => onEvent(field.eventType, { id: field.id })}
                    style={{
                      width: getStyleValue(field.width, defaultStyles.width),
                      height: getStyleValue(field.height, defaultStyles.height),
                      backgroundColor: getStyleValue(field.backgroundColor, '#00c4b4'),
                      color: getStyleValue(field.color, '#ffffff'),
                      fontSize: '14px',
                      padding: '4px 8px',
                      boxSizing: 'border-box',
                      margin: 0,
                      border: 'none',
                      borderRadius: '3px',
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
                      lineHeight: getStyleValue(field.height, defaultStyles.height),
                      boxSizing: 'border-box',
                      fontSize: '14px',
                      margin: 0,
                    }}
                  >
                    {field.label}
                  </span>
                )}
                {field.type === 'multiselect' && (
                  <div>
                    <Select
                      isMulti
                      id={field.id}
                      name={field.id}
                      options={field.options || []}
                      value={multiSelected[field.id] || []}
                      onChange={handleMultiChange(field.id)}
                      isDisabled={!field.enabled}
                      isSearchable={false}
                      closeMenuOnSelect={false}
                      hideSelectedOptions={false}
                      placeholder={'선택하세요'}
                      styles={multiSelectStyles(field)}
                      components={{
                        Option: CustomOption,
                        MultiValue: () => null,
                        ValueContainer: CustomValueContainer,
                        Input: () => null,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        {rows[rowIndex].buttons.length > 0 && (
          <div className='buttonContainer'>
            {rows[rowIndex].buttons.map((button) => (
              <button
                key={button.id}
                onClick={() => onEvent(button.eventType, { id: button.id })}
                className='btn btn-secondary btn-search'
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
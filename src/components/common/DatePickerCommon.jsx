import React, { useCallback } from 'react';
import DatePicker from 'react-datepicker';
import { ko } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import '../../assets/css/datepicker.css';

/**
 * 공통 날짜 선택 컴포넌트
 * @param {Object} props - 컴포넌트 속성
 * @param {string} id - 입력 필드 ID
 * @param {string} type - 날짜 선택 유형 (day, startday, endday, startmonth, endmonth, dayperiod, monthperiod)
 * @param {string|Object} value - 선택된 날짜 또는 범위 값
 * @param {Function} onChange - 값 변경 시 호출되는 함수
 * @param {string} placeholder - 입력 필드 플레이스홀더
 * @param {string} width - 입력 필드 너비
 * @param {string} height - 입력 필드 높이
 * @param {string} backgroundColor - 배경색
 * @param {string} color - 글자색
 * @param {boolean} enabled - 활성화 여부
 * @param {string} minDate - 최소 선택 가능 날짜
 * @param {string} maxDate - 최대 선택 가능 날짜
 */
const DatePickerCommon = ({ id, type, value, onChange, placeholder, width, height, backgroundColor, color, enabled, minDate, maxDate }) => {
  const defaultStyles = {
    width: '150px',
    height: '30px',
    backgroundColor: '#ffffff',
    color: '#000000',
  };

  const getStyleValue = (value, defaultValue) => value === 'default' || !value ? defaultValue : value;

  const formatDate = useCallback((date) => {
    if (!(date instanceof Date) || isNaN(date)) return '';
    return date.toISOString().split('T')[0];
  }, []);

  const formatMonth = useCallback((date) => {
    if (!(date instanceof Date) || isNaN(date)) return '';
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  }, []);

  const handleChange = useCallback((date) => {
    const formattedValue = (type === 'startmonth' || type === 'endmonth')
      ? formatMonth(date)
      : formatDate(date);
    onChange({ target: { value: formattedValue || '', id } });
  }, [id, type, onChange, formatDate, formatMonth]);

  const handleRangeChange = useCallback((dates) => {
    const [start, end] = dates || [null, null];
    const formattedValue = {
      start: start && !isNaN(start) ? formatDate(start) : '',
      end: end && !isNaN(end) ? formatDate(end) : '',
    };
    onChange({ target: { value: formattedValue, id } });
  }, [id, onChange, formatDate]);

  const handleMonthRangeChange = useCallback((dates) => {
    const [start, end] = dates || [null, null];
    const formattedValue = {
      start: start && !isNaN(start) ? formatMonth(start) : '',
      end: end && !isNaN(end) ? formatMonth(end) : '',
    };
    onChange({ target: { value: formattedValue, id } });
  }, [id, onChange, formatMonth]);

  const commonProps = {
    id,
    selected: value && typeof value === 'string' && !isNaN(new Date(value)) ? new Date(value) : null,
    placeholderText: placeholder || '',
    dateFormat: type.includes('month') ? 'yyyy-MM' : 'yyyy-MM-dd',
    locale: ko,
    showYearDropdown: true,
    showMonthDropdown: true,
    dropdownMode: 'select',
    popperPlacement: 'bottom',
    className: 'custom-datepicker-input',
    style: {
      width: getStyleValue(width, defaultStyles.width),
      height: getStyleValue(height, defaultStyles.height),
      backgroundColor: getStyleValue(backgroundColor, defaultStyles.backgroundColor),
      color: getStyleValue(color, defaultStyles.color),
      boxSizing: 'border-box',
      margin: 0, // 마진 제거
    },
    disabled: enabled === false,
    minDate: minDate && !isNaN(new Date(minDate)) ? new Date(minDate) : null,
    maxDate: maxDate && !isNaN(new Date(maxDate)) ? new Date(maxDate) : null,
  };

  return (
    <DatePicker
      {...commonProps}
      onChange={type === 'dayperiod' ? handleRangeChange : type === 'monthperiod' ? handleMonthRangeChange : handleChange}
      selectsRange={type === 'dayperiod' || type === 'monthperiod'}
      showMonthYearPicker={type === 'startmonth' || type === 'endmonth' || type === 'monthperiod'}
      startDate={value?.start && !isNaN(new Date(value.start)) ? new Date(value.start) : null}
      endDate={value?.end && !isNaN(new Date(value.end)) ? new Date(value.end) : null}
    />
  );
};

export default DatePickerCommon;
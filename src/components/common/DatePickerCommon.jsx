import React, { useCallback, useState, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import { ko } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import '../../assets/css/datepicker.css';

const DatePickerCommon = ({ id, type, value, onChange, placeholder, width, height, backgroundColor, color, enabled, minDate, maxDate }) => {
  const defaultStyles = { width: '150px', height: '30px', backgroundColor: '#ffffff', color: '#000000' };
  const getStyleValue = (val, def) => (val === 'default' || !val ? def : val);

  const [open, setOpen] = useState(false);

  const formatDate = useCallback((date) => (!(date instanceof Date) || isNaN(date)) ? '' : date.toISOString().split('T')[0], []);
  const formatMonth = useCallback((date) => (!(date instanceof Date) || isNaN(date)) ? '' : `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`, []);

  const handleChange = useCallback((date) => {
    const formatted = ['startmonth', 'endmonth', 'month'].includes(type) ? formatMonth(date) : formatDate(date);
    onChange({ target: { value: formatted || '', id } });
    setOpen(false);
  }, [id, type, onChange, formatDate, formatMonth]);

  const handleRangeChange = useCallback((dates) => {
    const [start, end] = dates || [null, null];
    onChange({
      target: {
        value: {
          start: start && !isNaN(start) ? formatDate(start) : '',
          end: end && !isNaN(end) ? formatDate(end) : '',
        },
        id,
      },
    });
    setOpen(false);
  }, [id, onChange, formatDate]);

  const handleMonthRangeChange = useCallback((dates) => {
    const [start, end] = dates || [null, null];
    onChange({
      target: {
        value: {
          start: start && !isNaN(start) ? formatMonth(start) : '',
          end: end && !isNaN(end) ? formatMonth(end) : '',
        },
        id,
      },
    });
    setOpen(false);
  }, [id, onChange, formatMonth]);

  const displayValue = useMemo(() => {
    if (type.includes('period')) {
      return value?.start && value?.end ? `${value.start} ~ ${value.end}` : '';
    }
    return value || '';
  }, [type, value]);

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
      margin: 0,
    },
    minDate: minDate && !isNaN(new Date(minDate)) ? new Date(minDate) : null,
    maxDate: maxDate && !isNaN(new Date(maxDate)) ? new Date(maxDate) : null,
    customInput: (
      <input
        readOnly
        value={displayValue}
        style={{
          width: getStyleValue(width, defaultStyles.width),
          height: getStyleValue(height, defaultStyles.height),
          backgroundColor: getStyleValue(backgroundColor, defaultStyles.backgroundColor),
          color: getStyleValue(color, defaultStyles.color),
          boxSizing: 'border-box',
          margin: 0,
          cursor: enabled ? 'pointer' : 'not-allowed',
        }}
        onClick={() => enabled && setOpen(true)} // enabled=false면 클릭 차단
        onKeyDown={(e) => e.preventDefault()} // 타이핑 차단
      />
    ),
    isOpen: open,
    onCalendarClose: () => setOpen(false),
    onCalendarOpen: () => enabled && setOpen(true),
  };

  return (
    <DatePicker
      {...commonProps}
      onChange={
        type === 'dayperiod'
          ? handleRangeChange
          : type === 'monthperiod'
          ? handleMonthRangeChange
          : handleChange
      }
      selectsRange={['dayperiod', 'monthperiod'].includes(type)}
      showMonthYearPicker={['startmonth', 'endmonth', 'month', 'monthperiod'].includes(type)}
      startDate={value?.start && !isNaN(new Date(value.start)) ? new Date(value.start) : null}
      endDate={value?.end && !isNaN(new Date(value.end)) ? new Date(value.end) : null}
    />
  );
};

export default DatePickerCommon;

export default {
  formatDate(date, format = 'YYYY-MM-DD') {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day);
  },

  formatNumber(num) {
    return num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') || '';
  },

  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  isEmpty(value) {
    return (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '') ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === 'object' && Object.keys(value).length === 0)
    );
  },

  getBaseName() {
    const baseName = import.meta.env.VITE_BASE_NAME ? `/${import.meta.env.VITE_BASE_NAME}` : '/';
    return baseName;
  },

  getClientUrl(arg) {
    const baseUrl = import.meta.env.VITE_CLIENT_URL || 'http://localhost:5173/ktn';
    return `${baseUrl.replace(/\/$/, '')}/${arg.replace(/^\//, '')}`;
  },

  getServerUrl(arg) {
    const baseUrl = import.meta.env.VITE_SERVER_API_URL || 'http://localhost:8080/api';
    return `${baseUrl.replace(/\/$/, '')}/${arg.replace(/^\//, '')}`;
  },

  getClientIp() {
    return '192.168.1.1';
  },

  validateVarcharLength(input, maxLength, fieldName) {
    if (typeof input !== 'string') {
      return { valid: false, error: `${fieldName}은(는) 문자열이어야 합니다.` };
    }
    const charLength = input.length;
    if (charLength > maxLength) {
      return {
        valid: false,
        error: `${fieldName}은(는) 최대 ${maxLength}자까지 입력 가능합니다. (현재: ${charLength}자)`,
      };
    }
    return { valid: true, error: '' };
  },

  formatMessageWithLineBreaks(msg) {
    if (!msg) return "";
    return msg.replace(/\r?\n/g, "<br />");
  },

  getTodayDate() {
    const options = {
      timeZone: 'Asia/Seoul', // 한국 표준시 타임존 지정
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };

    const formatter = new Intl.DateTimeFormat('ko-KR', options);
    const parts = formatter.formatToParts(new Date());

    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;

    if (month.length === 1) {
      month = '0' + month;
    }

    if (day.length === 1) {
      day = '0' + day;
    }

    return `${year}-${month}-${day}`;
  },

  getTodayMonth() {
    const options = {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit' // 항상 2자리로 추출
    };

    const formatter = new Intl.DateTimeFormat('ko-KR', options);
    const parts = formatter.formatToParts(new Date());

    const yearPart = parts.find(p => p.type === 'year').value;
    let monthPart = parts.find(p => p.type === 'month').value;

    // 혹시라도 month가 1자리일 경우, 앞에 0 붙이기
    if (monthPart.length === 1) {
      monthPart = '0' + monthPart;
    }

    return `${yearPart}-${monthPart}`;
  },

  getDateTime() {
    const nowUtc = new Date().getTime();
    const offsetKST = 9 * 60 * 60 * 1000;
    const nowKST = nowUtc + offsetKST;  // 밀리초 단위로 계산된 한국 시간 타임스탬프
    return nowKST; // 숫자(밀리초 타임스탬프) 반환
  },
};
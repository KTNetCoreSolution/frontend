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
};
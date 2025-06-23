const fileUtils = {
  // 상수 정의 (환경 변수에서 가져오거나 디폴트값 사용)
  _MAX_FILES: parseInt(import.meta.env.VITE_MAX_FILES, 10) || 5, // 최대 파일 수 (기본값 5)
  _MAX_FILE_SIZE: parseInt(import.meta.env.VITE_MAX_FILE_SIZE, 10) || 50 * 1024 * 1024, // 최대 파일 크기 (기본값 50MB)
  _ACCEPT: '*', // 기본적으로 모든 파일 허용

  // MAX_FILES getter/setter
  getMaxFiles() { // 최대 파일 수를 반환
    return this._MAX_FILES;
  },
  setMaxFiles(value) { // 최대 파일 수를 설정
    if (typeof value === 'number' && value > 0) {
      this._MAX_FILES = value;
    } else {
      console.warn('MAX_FILES는 양수 숫자여야 합니다.');
    }
  },

  // MAX_FILE_SIZE getter/setter
  getMaxFileSize() { // 최대 파일 크기를 반환
    return this._MAX_FILE_SIZE;
  },
  setMaxFileSize(value) { // 최대 파일 크기를 설정
    if (typeof value === 'number' && value > 0) {
      this._MAX_FILE_SIZE = value;
    } else {
      console.warn('MAX_FILE_SIZE는 양수 숫자여야 합니다.');
    }
  },

  // ACCEPT getter/setter
  getAccept() { // 현재 설정된 파일 허용 타입을 반환 (브라우저 호환성을 위해 정규화)
    if (this._ACCEPT === 'text/*') {
      return 'text/plain';
    }
    if (this._ACCEPT === 'document/*') {
      return this.documentExtensions
        .map(ext => this.mimeTypes[ext])
        .filter(mime => mime)
        .join(',');
    }
    return this._ACCEPT;
  },
    setAccept(value) { // 파일 허용 타입을 설정
    if (typeof value === 'string' && value.trim()) {
      const normalizedValue = value.trim().toLowerCase();
      if (normalizedValue === 'image/*') {
        this._ACCEPT = this.imageExtensions
          .map(ext => this.mimeTypes[ext])
          .filter(mime => mime)
          .join(',');
      } else if (normalizedValue === 'video/*') {
        this._ACCEPT = this.videoExtensions
          .map(ext => this.mimeTypes[ext])
          .filter(mime => mime)
          .join(',');
      } else if (normalizedValue === 'audio/*') {
        this._ACCEPT = this.audioExtensions
          .map(ext => this.mimeTypes[ext])
          .filter(mime => mime)
          .join(',');
      } else if (normalizedValue === 'text/*') {
        this._ACCEPT = this.textExtensions
          .map(ext => this.mimeTypes[ext])
          .filter(mime => mime)
          .join(',');
      } else if (normalizedValue === 'document/*') {
        this._ACCEPT = 'document/*';
      } else if (normalizedValue === 'excel/*' || normalizedValue === 'excel') { // Excel 전용 설정 추가
        this._ACCEPT = this.excelExtensions
          .map(ext => this.mimeTypes[ext])
          .filter(mime => mime)
          .join(',');
      } else if (normalizedValue === '*' || normalizedValue === '*/*') {
        this._ACCEPT = '*';
      } else {
        this._ACCEPT = normalizedValue;
      }
    } else if (Array.isArray(value) && value.length > 0) {
      const mimeTypes = value
        .map(ext => this.mimeTypes[ext.toLowerCase()])
        .filter(mime => mime)
        .join(',');
      this._ACCEPT = mimeTypes || '*';
    } else {
      console.warn('ACCEPT는 유효한 문자열 또는 확장자 배열이어야 합니다.');
      this._ACCEPT = '*'; // 기본값으로 모든 파일 허용
    }
  },

  // 파일이 유효한지 확인 (특정 조건에 따라 Excel 전용 체크 가능)
  isValidFile(file, excelOnly = false) {
    const extension = this.getFileExtension(file.fileName || file.name);
    const mimeType = this.mimeTypes[extension];

    if (this._ACCEPT === '*') {
      return !excelOnly || this.isExcelFileOnly(file); // Excel 전용 체크 적용
    }

    const acceptTypes = this._ACCEPT.split(',').map(type => type.trim());
    if (acceptTypes.includes(mimeType)) {
      return !excelOnly || this.isExcelFileOnly(file); // Excel 전용 체크 적용
    }

    if (this._ACCEPT === 'document/*' && this.isDocumentFile(file)) {
      return !excelOnly || this.isExcelFileOnly(file); // Excel 전용 체크 적용
    }
    if (acceptTypes.some(type => type === 'image/*' && this.isImageFile(file))) {
      return false; // Excel 전용 모드에서는 이미지 불가
    }
    if (acceptTypes.some(type => type === 'video/*' && this.isVideoFile(file))) {
      return false; // Excel 전용 모드에서는 동영상 불가
    }
    if (acceptTypes.some(type => type === 'audio/*' && this.isAudioFile(file))) {
      return false; // Excel 전용 모드에서는 오디오 불가
    }
    if (acceptTypes.some(type => type === 'text/plain' && this.isTextFile(file))) {
      return false; // Excel 전용 모드에서는 텍스트 불가
    }

    return false;
  },

  // Excel 파일만 체크
  isExcelFileOnly(file) {
    const extension = this.getFileExtension(file.fileName || file.name);
    return this.excelExtensions.includes(extension);
  },

  // MIME 타입 매핑
  mimeTypes: {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    webp: 'image/webp',
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    tar: 'application/x-tar',
    gz: 'application/gzip',
    mp4: 'video/mp4',
    mpeg: 'video/mpeg',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    wmv: 'video/x-ms-wmv',
    flv: 'video/x-flv',
    webm: 'video/webm',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    aac: 'audio/aac',
    flac: 'audio/flac',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    log: 'text/plain',
  },

  imageExtensions: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'webp'],
  zipExtensions: ['zip', 'rar', '7z', 'tar', 'gz'],
  videoExtensions: ['mp4', 'mpeg', 'mov', 'avi', 'wmv', 'flv', 'webm'],
  audioExtensions: ['mp3', 'wav', 'ogg', 'aac', 'flac'],
  textExtensions: ['txt', 'log'],
  documentExtensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'],
  excelExtensions: ['xls', 'xlsx'],

  formatFileSize(bytes) { // 파일 크기를 가독성 있는 단위로 변환
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  getFileExtension(fileName) { // 파일 이름에서 확장자를 추출
    return fileName.split('.').pop().toLowerCase();
  },

  isImageFile(file) { // 이미지 파일인지 확인
    const extension = this.getFileExtension(file.fileName || file.name);
    return this.imageExtensions.includes(extension);
  },

  isZipFile(file) { // ZIP 파일인지 확인
    const extension = this.getFileExtension(file.fileName || file.name);
    return this.zipExtensions.includes(extension);
  },

  isVideoFile(file) { // 동영상 파일인지 확인
    const extension = this.getFileExtension(file.fileName || file.name);
    return this.videoExtensions.includes(extension);
  },

  isAudioFile(file) { // 오디오 파일인지 확인
    const extension = this.getFileExtension(file.fileName || file.name);
    return this.audioExtensions.includes(extension);
  },

  isTextFile(file) { // 텍스트 파일인지 확인
    const extension = this.getFileExtension(file.fileName || file.name);
    return this.textExtensions.includes(extension);
  },

  isDocumentFile(file) { // 문서 파일인지 확인
    const extension = this.getFileExtension(file.fileName || file.name);
    return this.documentExtensions.includes(extension);
  },

  isExcelFile(file) { // 엑셀 파일인지 확인
    const extension = this.getFileExtension(file.fileName || file.name);
    return this.excelExtensions.includes(extension);
  },

  getFileIcon(file) { // 파일 타입에 따른 Bootstrap 아이콘 반환
    const extension = this.getFileExtension(file.fileName || file.name);
    if (this.imageExtensions.includes(extension)) {
      return 'bi-image';
    } else if (this.zipExtensions.includes(extension)) {
      return 'bi-file-earmark-zip';
    } else if (this.videoExtensions.includes(extension)) {
      return 'bi-camera-video';
    } else if (this.audioExtensions.includes(extension)) {
      return 'bi-music-note';
    } else if (extension === 'pdf') {
      return 'bi-file-earmark-pdf';
    } else if (['doc', 'docx'].includes(extension)) {
      return 'bi-file-earmark-word';
    } else if (['xls', 'xlsx'].includes(extension)) {
      return 'bi-file-earmark-excel';
    } else if (['ppt', 'pptx'].includes(extension)) {
      return 'bi-file-earmark-slides';
    } else if (this.textExtensions.includes(extension)) {
      return 'bi-file-earmark-text';
    } else {
      return 'bi-file-earmark';
    }
  },

  decodeBase64ToText(base64String) { // Base64 문자열을 UTF-8 텍스트로 디코딩
    try {
      const decodedData = atob(base64String);
      return decodeURIComponent(escape(decodedData));
    } catch (error) {
      console.error('Error decoding base64 to text:', error);
      throw new Error('텍스트 파일을 디코딩하는 중 오류가 발생했습니다.');
    }
  },

  encodeTextToBase64(text) { // UTF-8 텍스트를 Base64 문자열로 인코딩
    try {
      const encodedData = unescape(encodeURIComponent(text));
      return btoa(encodedData);
    } catch (error) {
      console.error('Error encoding text to base64:', error);
      throw new Error('텍스트를 Base64로 인코딩하는 중 오류가 발생했습니다.');
    }
  },
};

export default fileUtils;
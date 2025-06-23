/**
 * 입력 필드의 변경 이벤트를 처리하여 상태를 업데이트합니다.
 * @param {Object} e - 입력 요소에서 발생한 이벤트 객체
 * @param {Function} setState - React 상태 업데이트 함수 (setState)
 */
export const handleInputChange = (e, setState) => {
  const { name, value } = e.target; // 입력 요소의 name과 value 추출
  setState((prev) => ({ ...prev, [name]: value })); // 이전 상태를 복사하고, name에 해당하는 값을 value로 업데이트
};

/**
 * 키보드 입력 중 Enter 키를 감지하여 콜백 함수를 실행합니다.
 * @param {Object} e - 키보드 이벤트 객체
 * @param {Function} callback - Enter 키 입력 시 실행할 함수
 */
export const handleKeyUp = (e, callback) => {
  if (e.key === "Enter") { // Enter 키 입력 확인
    callback(); // 전달된 콜백 함수 실행 (예: 검색 요청)
  }
};

/**
 * 검색 버튼 클릭 시 검색 로직을 실행합니다.
 * @param {Function} callback - 검색 로직을 포함한 함수
 */
export const handleSearch = (callback) => callback(); // 단순히 전달된 검색 함수를 즉시 호출

/**
 * 상태를 초기화하고 추가적인 작업을 수행합니다.
 * @param {Function} setState - 상태를 업데이트하는 React setState 함수
 * @param {Object} resetValues - 초기화할 상태 값
 * @param {Array<Function>} [additionalCallbacks=[]] - 초기화 후 실행할 추가 함수 배열
 */
export const handleReset = (setState, resetValues, additionalCallbacks = []) => {
  setState(resetValues); // 상태를 지정된 초기 값으로 설정
  additionalCallbacks.forEach((cb) => cb()); // 배열에 포함된 각 콜백 함수를 순차적으로 실행
};

/**
 * 필터 필드 배열을 기반으로 초기 필터 상태 객체를 생성합니다.
 * @param {Array<Object>} fields - 필터 필드 정의 배열 (각 객체는 id와 defaultValue 속성을 포함)
 * @returns {Object} 초기화된 필터 상태 객체 (키: 필드 ID, 값: defaultValue 또는 빈 문자열)
 */
export const initialFilters = (fields) => {
  return Object.fromEntries(
    fields.map(field => [
      field.id,
      field.defaultValue !== undefined ? field.defaultValue : (field.type === 'checkbox' ? false : '')
    ])
  );
};
// Tabulator 6.3.1 버전에 맞춘 테이블 생성 함수
import { TabulatorFull as Tabulator } from 'tabulator-tables';

/**
 * Tabulator 테이블을 생성하는 함수
 * @param {HTMLElement} element - 테이블이 렌더링될 DOM 요소
 * @param {Array} cols - 테이블에 표시할 컬럼 배열
 * @param {Array} data - 테이블에 표시할 데이터 배열
 * @param {Object} [customOptions] - 사용자 정의 옵션 (기본 옵션과 병합됨)
 * @returns {Tabulator} - 생성된 Tabulator 인스턴스
 */
export function createTable(element, cols, data, customOptions = {}) {
  // cellStyle을 처리하는 함수
  const applyCellStyle = (cell, style) => {
    if (style && typeof style === 'object') {
      const cellElement = cell.getElement();
      Object.keys(style).forEach((styleKey) => {
        cellElement.style[styleKey] = style[styleKey];
      });
    }
    return cell.getValue() !== undefined && cell.getValue() !== null ? cell.getValue() : '';
  };

  // 컬럼 정의를 처리하여 cellStyle을 적용하고 제거
  const processedCols = cols.map((col) => {
    if (col.cellStyle && typeof col.cellStyle === 'object') {
      const originalFormatter = col.formatter;
      const { cellStyle, ...rest } = col; // Destructure only if cellStyle exists
      return {
        ...rest,
        formatter: (cell) => {
          applyCellStyle(cell, cellStyle);
          return originalFormatter ? originalFormatter(cell) : cell.getValue();
        },
      };
    }
    return { ...col }; // Return a new object to avoid mutating the original
  });

  // 기본 옵션 정의 (Tabulator 6.3.1 기준)
  const defaultOptions = {
    // --- 기본 설정 ---
    height: '50vh',                  // 테이블 높이. 픽셀(px), 퍼센트(%), 뷰포트 단위(vh) 가능. undefined면 컨테이너에 맞춤
    layout: 'fitColumns',            // 레이아웃 모드. 'fitColumns'는 열 너비를 테이블 너비에 맞게 조정. 지원: 'fitData', 'fitDataFill', 'fitDataStretch'
    layoutColumnsOnNewData: false,   // 새 데이터 로드 시 열 레이아웃 재계산 여부. false면 기존 레이아웃 유지
    responsiveLayout: false,         // 반응형 레이아웃 활성화. 작은 화면에서 열 축소. 지원: 'hide', 'collapse'
    responsiveLayoutCollapseStartOpen: true, // 반응형 축소 시 열림 상태. true면 처음부터 열림
    autoResize: true,                // 창 크기 조정 시 자동 리사이즈. true면 브라우저 크기 변화에 반응
    renderVertical: 'virtual',       // 수직 렌더링 모드. 'virtual'은 가상 DOM 사용, 'basic'은 전체 렌더링
    renderHorizontal: 'virtual',     // 수평 렌더링 모드. 'virtual'은 가상 DOM 사용, 'basic'은 전체 렌더링

    // --- 데이터 관련 ---
    data: data || [],                // 테이블 데이터. 초기 데이터가 없으면 빈 배열
    reactiveData: false,             // 데이터 반응형 처리. true면 데이터 변경 시 자동 갱신 (주의: 성능 영향)
    dataTree: false,                 // 트리 구조 데이터 활성화. true면 계층적 데이터 표시
    dataTreeStartExpanded: false,    // 트리 처음부터 확장 여부. false면 축소 상태로 시작
    columns: processedCols,          // 열 정의. 필수 옵션으로 열 배열 전달
    autoColumns: false,              // 데이터 기반 자동 열 생성. true면 열 정의 없이 데이터에서 추출
    movableColumns: true,            // 열 이동 가능 여부. true면 드래그로 열 순서 변경 가능
    resizableColumns: true,          // 열 크기 조정 가능 여부. true면 열 너비 조정 가능
    headerVisible: true,             // 헤더 표시 여부. false면 헤더 숨김
    headerSort: true,                // 헤더 정렬 가능 여부. true면 클릭으로 정렬
    headerFilterLiveFilterDelay: 300, // 헤더 필터 입력 지연 시간 (ms). 입력 후 지연 시간 적용

    // --- 행 관련 ---
    movableRows: true,               // 행 이동 가능 여부. true면 드래그로 행 순서 변경 가능
    resizableRows: false,            // 행 크기 조정 가능 여부. false면 행 높이 고정
    selectable: true,                // 행 선택 가능 여부. true면 단일/다중 선택 가능 (숫자나 'highlight'도 가능)
    selectableRollingSelection: true, // 연속 선택 유지. true면 Shift 키로 범위 선택 가능
    selectablePersistence: true,     // 선택 상태 유지. true면 데이터 변경 후 선택 유지

    // --- 페이지네이션 ---
    pagination: 'local',             // 페이지네이션 모드. 'local'은 클라이언트 측, 'remote'은 서버 측. false면 비활성화
    paginationSize: 50,              // 페이지당 행 수. 페이지 크기 설정
    paginationButtonCount: 10,       // 표시할 페이지 버튼 수. 페이지 네비게이션 버튼 개수
    paginationSizeSelector: [50, 100, 200, 300], // 페이지 크기 선택 옵션. 드롭다운으로 선택 가능
    paginationInitialPage: 1,        // 초기 페이지 번호. 1부터 시작

    // --- 플레이스홀더 ---
    placeholder: '데이터가 없습니다.',      // 데이터 없을 때 표시 메시지. 문자열 또는 함수 가능

    // --- 이벤트 핸들러 ---
    columnMoved: (column, columns) => {
      console.log('Column moved:', column.getField(), columns.map(col => col.getField()));
    },                               // 열 이동 시 호출. 이동된 열과 전체 열 배열 로깅

    columnDefaults:{
        tooltip:true,                // 툴팁 (데이터 값을 툴팁으로 표시하려면 true)
        cssClass: "",                // 컬럼 및 데이터 셀에 적용할 CSS 클래스 ("" - 기본 없음)
    }
  };

  // 사용자 정의 옵션과 기본 옵션 병합
  const options = { ...defaultOptions, ...customOptions, data };

  //options.headerSortElement = "<span style='font-size: 1rem; padding: 5px;'>"; // Increase header font size and padding

  try {
    const table = new Tabulator(element, options);
    return table;
  } catch (error) {
    console.error('Tabulator 생성 실패:', error);
    throw error; // 호출자에게 에러 전파
  }
}
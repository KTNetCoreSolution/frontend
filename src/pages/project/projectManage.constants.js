export const STATUS_LABEL = {
  RECEIVED: "접수",
  UNDER_REVIEW: "검토중",
  APPROVED: "개선확정",
  REJECTED: "반려",
  IN_PROGRESS: "개선중",
  COMPLETED: "개선완료",
};

export const STATUS_OPTIONS = [
  { value: "", label: "선택하세요" },
  { value: "RECEIVED", label: "접수" },
  { value: "UNDER_REVIEW", label: "검토중" },
  { value: "APPROVED", label: "개선확정" },
  { value: "REJECTED", label: "반려" },
  { value: "IN_PROGRESS", label: "개선중" },
  { value: "COMPLETED", label: "개선완료" },
  { value: "PROJECTING", label: "프로젝트" },
];

export const IMPROVETYPE_OPTIONS = [
  { value: "", label: "선택하세요" },
  { value: "신규", label: "신규" },
  { value: "개선", label: "개선" },
  { value: "오류", label: "오류" },
  { value: "기타", label: "기타" },
];

export const WORKFIELD_OPTIONS = [
  { value: "", label: "선택하세요" },
  { value: "LINE", label: "선로" },
  { value: "DESIGN", label: "설계" },
  { value: "BIZ", label: "BIZ" },
  { value: "COMMON", label: "공통" },
];

export const SYSTEM_OPTIONS = [
  { value: "", label: "선택하세요" },
  { value: "ATACAMA", label: "ATACAMA" },
  { value: "NeOSS", label: "NeOSS" },
  { value: "OSS", label: "OSS" },
  { value: "ERP", label: "ERP" },
  { value: "KOS SR/TT", label: "KOS SR/TT" },
  { value: "BI/DW", label: "BI/DW" },
  { value: "표준활동", label: "표준활동" },
  { value: "차량관리", label: "차량관리" },
  { value: "사외공사장 통합관리", label: "사외공사장 통합관리" },
  { value: "기타", label: "기타" },
];

export const clampPercent = (n) => {
  const v = Number(n);
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(100, v));
};

export const formatDate = (value) => {
  if (!value) return "";
  const s = String(value);
  if (s.length >= 10) return s.slice(0, 10);
  return s;
};

export const COMMON_LABEL = (value) => {
  return value === "COMMON" ? "공통" : value;
};

export const getToday = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export const pickFirst = (...values) => {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return "";
};

export const normalizeDetailData = (raw) => {
  const d = Array.isArray(raw) ? (raw[0] ?? {}) : (raw ?? {});

  return {
    id: pickFirst(d.PROJECTID, d.projectId),

    improveType: pickFirst(d.IMPROVETYPE, d.improveType),
    workField: pickFirst(d.WORKFIELD, d.workField),
    classACd: pickFirst(d.CLASSACD, d.classACd),
    classANm: pickFirst(d.CLASSANM, d.classANm, d.CLASSACD, d.classACd),
    classBCd: pickFirst(d.CLASSBCD, d.classBCd),
    classBNm: pickFirst(d.CLASSBNM, d.classBNm, d.CLASSBCD, d.classBCd),
    systemNm: pickFirst(d.SYSTEMNM, d.systemNm),
    projectNm: pickFirst(d.PROJECTNM, d.projectNm),
    requestDept: pickFirst(d.REQUESTDEPT, d.requestDept),
    issueCn: pickFirst(d.ISSUECN, d.issueCn),
    reqCn: pickFirst(d.REQCN, d.reqCn),
    ownerDept: pickFirst(d.OWNERDEPT, d.ownerDept),
    owner: pickFirst(d.OWNER, d.owner),
    requestDate: formatDate(pickFirst(d.REQUESTDT, d.REQUESTDATE, d.requestDate, d.REGDT, d.regDt)),
    regDt: formatDate(pickFirst(d.REGDT, d.regDt)),
    lastUpdated: formatDate(pickFirst(d.UPDDT, d.LASTUPDATEDT, d.lastUpdated)),

    reviewProjectNm: pickFirst(d.RVW_PROJECTNM, d.rvwProjectNm, d.reviewProjectNm),
    reviewImproveType: pickFirst(d.RVW_IMPROVETYPE, d.rvwImproveType, d.reviewImproveType),
    reviewWorkField: pickFirst(d.RVW_WORKFIELD, d.rvwWorkField, d.reviewWorkField),
    reviewClassANm: pickFirst(d.RVW_CLASSANM, d.rvwClassANm, d.reviewClassANm, d.RVW_CLASSACD, d.rvwClassAcd),
    reviewClassBNm: pickFirst(d.RVW_CLASSBNM, d.rvwClassBNm, d.reviewClassBNm, d.RVW_CLASSBCD, d.rvwClassBcd),
    reviewSystemNm: pickFirst(d.RVW_SYSTEMNM, d.rvwSystemNm, d.reviewSystemNm),
    reviewIssueCn: pickFirst(d.RVW_ISSUECN, d.rvwIssueCn, d.reviewIssueCn),
    reviewReqCn: pickFirst(d.RVW_REQCN, d.rvwReqCn, d.reviewReqCn),
    reviewer: pickFirst(d.REVIEWER, d.reviewer),
    reviewDate: formatDate(pickFirst(d.REVIEWDT, d.reviewDt, d.RVW_UPDDT, d.rvwUpddt, d.UPDDT)),

    status: pickFirst(d.STATUS, d.status, "RECEIVED"),
    progress: clampPercent(pickFirst(d.PROGRESS, d.progress, 0)),
    meetingDt: formatDate(pickFirst(d.MEETINGDT, d.meetingDt)),
    startDt: formatDate(pickFirst(d.STARTDT, d.startDt)),
    endDt: formatDate(pickFirst(d.ENDDT, d.endDt)),
  };
};

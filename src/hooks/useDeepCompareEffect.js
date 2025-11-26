import { useEffect, useRef } from "react";

export default function useDeepCompareEffect(effect, deps) {
  const prevDeps = useRef([]);
  const prevDepsString = useRef("");

  // 현재 deps를 문자열로 변환
  const currentDepsString = JSON.stringify(deps);

  // 문자열이 다르면 → deps 변경됨
  const isChanged = prevDepsString.current !== currentDepsString;

  if (isChanged) {
    prevDeps.current = deps;
    prevDepsString.current = currentDepsString;
  }

  // deps는 문자열을 기준으로 안정화된 prevDeps 사용
  useEffect(effect, [prevDepsString.current]);
}

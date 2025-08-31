import React, { useState, useEffect, useMemo } from "react";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { TreeItem } from "@mui/x-tree-view/TreeItem";
import { FaChevronDown, FaChevronRight } from "react-icons/fa";
import Checkbox from "@mui/material/Checkbox";
import styled from "styled-components";
import styles from "./OrgSearchPopup.module.css";
import useStore from "../../store/store";
import { fetchData } from "../../utils/dataUtils";
import { errorMsgPopup } from "../../utils/errorMsgPopup";
import { convertOrgInfoToHierarchy } from "../../utils/hierarchyJsonUtils";
import common from '../../utils/common';

const TreeWrapper = styled.div`
  flex: 1;
  overflow-y: auto;
  & .MuiTreeView-root {
    width: 100%;
    --TreeView-itemChildrenIndentation: 16px;
  }
  & .MuiTreeItem-content {
    padding: 2px 6px;
    padding-left: calc(8px + var(--TreeView-itemChildrenIndentation) * var(--TreeView-itemDepth));
    box-sizing: border-box;
  }
  & .MuiTreeItem-label {
    font-size: 13px;
    line-height: 1.5;
  }
  & .MuiTreeItem-iconContainer {
    width: 16px;
    display: flex;
    align-items: center;
  }
`;

const StyledTreeItem = styled(TreeItem, {
  shouldForwardProp: (prop) => !['ownerState', 'theme', 'sx', 'as'].includes(prop)
})`
  & .MuiTreeItem-content {
    padding: 2px 6px;
    padding-left: calc(8px + var(--TreeView-itemChildrenIndentation, 16px) * var(--TreeView-itemDepth));
    box-sizing: border-box;
  }
  & .MuiTreeItem-label {
    font-family: "Pretendard Variable", -apple-system, "Segoe UI", Roboto, Arial, sans-serif !important;
    font-size: 13px;
    line-height: 1.5;
  }
  & .MuiTreeItem-iconContainer {
    width: 16px;
    display: flex;
    align-items: center;
  }
`;

const StyledChevronDown = styled(FaChevronDown)({
  width: '12px',
  height: '12px',
  color: '#212529',
});

const StyledChevronRight = styled(FaChevronRight)({
  width: '12px',
  height: '12px',
  color: '#212529',
});

const OrgSearchPopup = ({ onClose, onConfirm, initialSelectedOrgs = [], pGUBUN, isMulti = true, isChecked = true }) => {
  const { user } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [treeData, setTreeData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [expanded, setExpanded] = useState([]);

  // initialSelectedOrgs를 정규화하여 배열로 변환
  const normalizedInitialSelectedOrgs = useMemo(() => {
    if (typeof initialSelectedOrgs === 'string') {
      return initialSelectedOrgs.split(',').map((code) => code.trim()).filter(Boolean);
    }
    return Array.isArray(initialSelectedOrgs) ? initialSelectedOrgs : [];
  }, [initialSelectedOrgs]);

  // 의존성 배열용 키
  const initialSelectedOrgsKey = useMemo(() => normalizedInitialSelectedOrgs.join(","), [normalizedInitialSelectedOrgs]);

  // 트리 데이터 초기화
  useEffect(() => {
    setIsOpen(true);
    const loadData = async () => {
      setLoading(true);

      try {
        const params = {
          pGUBUN: pGUBUN || "EMPNO",
          pMDATE: common.getTodayMonth(),
          pSEARCH: user?.empNo || "",
          pDEBUG: "F",
        };
        const response = await fetchData("common/orginfo/list", params);

        if (!response.success || response.errMsg) {
          errorMsgPopup(response.message || "데이터를 가져오는 중 오류가 발생했습니다.");
          setTreeData([]);
          return;
        }

        const responseData = Array.isArray(response.data) ? response.data : [];
        const hierarchicalData = convertOrgInfoToHierarchy(responseData);

        let seqCounter = 1;
        const assignSeq = (nodes) =>
          nodes.map((item) => {
            const newItem = {
              ...item,
              id: `node-${seqCounter++}`,
              name: item.ORGNM || "Unknown",
              ORGCD: item.ORGCD || "",
              UPPERORGCD: item.UPPERORGCD || "",
              ORGLEVEL: item.ORGLEVEL || 0,
            };
            if (item._children) {
              newItem.children = assignSeq(item._children);
            }
            return newItem;
          });

        const finalData = assignSeq(hierarchicalData);
        setTreeData(finalData);

        // isChecked가 false가 아니면 initialSelectedOrgs로 체크박스 자동 선택
        if (isChecked !== false && normalizedInitialSelectedOrgs.length > 0) {
          const preSelectedIds = [];
          const findIdsByOrgCd = (nodes, orgCds) => {
            nodes.forEach((node) => {
              if (orgCds.includes(node.ORGCD)) {
                preSelectedIds.push(node.id);
              }
              if (node.children) {
                findIdsByOrgCd(node.children, orgCds);
              }
            });
          };
          findIdsByOrgCd(finalData, normalizedInitialSelectedOrgs);
          setSelectedIds(preSelectedIds);
        }

        // 1레벨 노드만 기본 확장
        const initialExpanded = finalData
          .filter((node) => node.ORGLEVEL <= 1)
          .map((node) => node.id);
        setExpanded(initialExpanded);
      } catch (error) {
        console.error("Error loading data:", error);
        errorMsgPopup("데이터를 가져오는 중 오류가 발생했습니다.");
        setTreeData([]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user?.empNo, initialSelectedOrgsKey, pGUBUN, isChecked]);

  // 노드 확장/축소 처리
  const handleToggle = (event, itemId, isExpanded) => {
    setExpanded((prev) =>
      isExpanded ? [...prev, itemId] : prev.filter((id) => id !== itemId)
    );
  };

  // 하위 노드 ID 수집
  const collectChildIds = (node) => {
    let ids = [node.id];
    if (node.children) {
      node.children.forEach((child) => {
        ids = [...ids, ...collectChildIds(child)];
      });
    }
    return ids;
  };

  // 체크박스 선택 처리
  const handleSelect = (nodeId) => {
    setSelectedIds((prev) => {
      const isSelected = prev.includes(nodeId);
      const node = findNodeById(treeData, nodeId);
      if (!node) return prev;

      if (!isMulti) {
        // 단일 선택 모드
        if (isSelected) {
          return []; // 이미 선택된 경우 해제
        } else {
          return [nodeId]; // 새로 선택한 노드만 유지
        }
      } else {
        // 다중 선택 모드
        const childIds = node.children ? collectChildIds(node).filter((id) => id !== nodeId) : [];
        if (isSelected) {
          return prev.filter((id) => id !== nodeId && !childIds.includes(id));
        } else {
          const newIds = [...new Set([...prev, nodeId, ...childIds])];
          return newIds;
        }
      }
    });
  };

  // ID로 노드 찾기
  const findNodeById = (nodes, id) => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // 최상위 선택된 노드만 수집
  const collectTopLevelSelected = (nodes, selectedIds) => {
    let selected = [];
    nodes.forEach((node) => {
      if (!node || !node.id) {
        console.warn("Invalid node found:", node);
        return;
      }
      if (selectedIds.includes(node.id)) {
        selected.push({
          ORGCD: node.ORGCD || "",
          ORGNM: node.name || "Unknown",
        });
      } else if (node.children) {
        selected = [...selected, ...collectTopLevelSelected(node.children, selectedIds)];
      }
    });
    return selected;
  };

  // 확인 버튼 처리
  const handleConfirm = () => {
    try {
      if (onConfirm) {
        const selectedNodes = collectTopLevelSelected(treeData, selectedIds);
        const orgCd = selectedNodes.map((node) => node.ORGCD).filter(Boolean).join(",");
        const orgNm = selectedNodes.map((node) => node.ORGNM).filter(Boolean).join(",");
        onConfirm([{ ORGCD: orgCd, ORGNM: orgNm }]);
      }
    } catch (error) {
      console.error("Error in handleConfirm:", error);
      errorMsgPopup("선택된 데이터를 처리하는 중 오류가 발생했습니다.");
    } finally {
      handleClose();
    }
  };

  // 닫기 버튼 처리
  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };

  // 커스텀 노드 렌더링
  const renderTreeItems = (nodes) =>
    nodes.map((node) => (
      <StyledTreeItem
        key={node.id}
        itemId={node.id}
        label={
          <div className={styles.nodeContainer}>
            <Checkbox
              checked={selectedIds.includes(node.id)}
              onChange={() => handleSelect(node.id)}
              onClick={(e) => e.stopPropagation()}
              sx={{
                width: 16,
                height: 16,
                padding: 0,
                borderRadius: 4,
                '&.Mui-checked': {
                  color: 'var(--bs-primary-color)',
                  
                },
                '& .MuiSvgIcon-root': {
                  fontSize: 18,
                  borderRadius: 4,
                  border: 'none',
                }
              }}
            />
            <span className={styles.nodeLabel}>
              {node.name} (레벨: {node.ORGLEVEL})
            </span>
          </div>
        }
      >
        {node.children && renderTreeItems(node.children)}
      </StyledTreeItem>
    ));

  if (!isOpen) return null;

  return (
    <div className='overlay'>
      <div className='popupContainer'>
        <div className='header'>
          <h3>조직 선택</h3>
          <button className='closeButton' onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="body">
          <TreeWrapper className='tableWrapper'>
            {loading && <div className={styles.loading}>로딩 중...</div>}
            {!loading && treeData.length === 0 && (
              <div className={styles.loading}>데이터가 없습니다.</div>
            )}
            {!loading && treeData.length > 0 && (
              <SimpleTreeView
                slots={{
                  collapseIcon: StyledChevronDown,
                  expandIcon: StyledChevronRight,
                }}
                expandedItems={expanded}
                onItemExpansionToggle={handleToggle}
                multiSelect={isMulti}
                disableSelection={false}
              >
                {renderTreeItems(treeData)}
              </SimpleTreeView>
            )}
          </TreeWrapper>
        </div>

        <div className='buttonContainer'>
          <button
            className='btn btnSecondary'
            onClick={handleClose}
          >
            닫기
          </button>
          <button
            className='btn btnPrimary'
            onClick={handleConfirm}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrgSearchPopup;
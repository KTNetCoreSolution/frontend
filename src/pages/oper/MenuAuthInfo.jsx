import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { fetchData } from "../../utils/dataUtils";
import useStore from '../../store/store';
import { hasPermission } from '../../utils/authUtils';
import { errorMsgPopup } from "../../utils/errorMsgPopup";
import { msgPopup } from "../../utils/msgPopup";
import styles from './MenuAuthInfo.module.css';

const MenuAuthInfo = () => {
  const { user } = useStore();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [initialData, setInitialData] = useState([]);
  const [authFields, setAuthFields] = useState([]);
  const [changedCells, setChangedCells] = useState(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !hasPermission(user.auth, 'menuAuth')) {
      navigate('/');
      return;
    }
    fetchMenuAuthData();
  }, [user, navigate]);

  const calculateMenuLevel = (row, data, visited = new Set()) => {
    if (!row.UPPERMENUID) return 1;
    if (visited.has(row.MENUID)) return 1;
    visited.add(row.MENUID);
    const parent = data.find(item => item.MENUID === row.UPPERMENUID);
    if (!parent) return 1;
    return calculateMenuLevel(parent, data, visited) + 1;
  };

  const fetchMenuAuthData = async () => {
    const params = { param1: "F" };
    try {
      const response = await fetchData("oper/menuauthinfo/list", params );

      if (!response.success) {
        errorMsgPopup(response.message || "메뉴 권한 데이터를 가져오는 중 오류가 발생했습니다.");
        setData([]);
        setInitialData([]);
        setAuthFields([]);
        return;
      } else {
        if (response.errMsg !== '') {
          errorMsgPopup(response.errMsg);
          setData([]);
          setInitialData([]);
          setAuthFields([]);
          return;
        }
      }

      const responseData = Array.isArray(response.data) ? response.data : [];

      const authNames = responseData.length > 0 && Array.isArray(responseData[0].children)
        ? responseData[0].children.map(child => child.AUTHNM)
        : [];

      const leveledData = responseData.map(row => ({
        ...row,
        MENULEVEL: calculateMenuLevel(row, responseData)
      }));

      const isConsistent = responseData.every(row =>
        Array.isArray(row.children) &&
        row.children.map(child => child.AUTHNM).join(',') === authNames.join(',')
      );
      if (!isConsistent) {
        console.warn('Warning: Inconsistent AUTHNM order across menu items');
      }

      setData(leveledData);
      setInitialData(leveledData);
      setAuthFields(authNames);
      setChangedCells(new Map());
    } catch (error) {
      console.error("메뉴 권한 데이터 조회 실패:", {
        message: error.message,
        response: error.response ? {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        } : 'No response received'
      });
      errorMsgPopup(error.response?.data?.message || "메뉴 권한 데이터를 가져오는 중 오류가 발생했습니다.");
      setData([]);
      setInitialData([]);
      setAuthFields([]);
    }
  };

  const formatMenuName = (menuName, level) => {
    if (level === 1) return menuName;
    return `${"  ".repeat(level - 2)}└${menuName}`;
  };

  const getAuthYn = (menu, authName) => {
    const auth = menu.children.find(child => child.AUTHNM === authName);
    return auth ? auth.AUTHYN : "N";
  };

  const updateAuthYn = (menu, authName, value) => {
    return {
      ...menu,
      children: menu.children.map(child =>
        child.AUTHNM === authName ? { ...child, AUTHYN: value } : child
      )
    };
  };

  const isCellChanged = (menuId, authName) => {
    const row = data.find(r => r.MENUID === menuId);
    const initialRow = initialData.find(r => r.MENUID === menuId);
    if (!row || !initialRow) return false;
    const currentAuth = row.children.find(c => c.AUTHNM === authName);
    const initialAuth = initialRow.children.find(c => c.AUTHNM === authName);
    return currentAuth && initialAuth && currentAuth.AUTHYN !== initialAuth.AUTHYN;
  };

  const isRowChanged = (menuId) => {
    return authFields.some(authName => changedCells.has(`${menuId}-${authName}`));
  };

  const handleRadioChange = (menuId, authName, value) => {
    setData(prevData =>
      prevData.map(row =>
        row.MENUID === menuId ? updateAuthYn(row, authName, value) : row
      )
    );

    setChangedCells(prev => {
      const newChangedCells = new Map(prev);
      const key = `${menuId}-${authName}`;
      
      const updatedData = data.map(row =>
        row.MENUID === menuId ? updateAuthYn(row, authName, value) : row
      );
      const row = updatedData.find(r => r.MENUID === menuId);
      const initialRow = initialData.find(r => r.MENUID === menuId);
      if (!row || !initialRow) return newChangedCells;

      const currentAuth = row.children.find(c => c.AUTHNM === authName);
      const initialAuth = initialRow.children.find(c => c.AUTHNM === authName);
      const isChanged = currentAuth && initialAuth && currentAuth.AUTHYN !== initialAuth.AUTHYN;

      if (isChanged) {
        newChangedCells.set(key, true);
      } else {
        newChangedCells.delete(key);
      }
      
      return newChangedCells;
    });
  };

  const handleSelectAll = (authName, checked) => {
    setData(prevData =>
      prevData.map(row => updateAuthYn(row, authName, checked ? "Y" : "N"))
    );

    setChangedCells(prev => {
      const newChangedCells = new Map(prev);
      data.forEach(row => {
        const key = `${row.MENUID}-${authName}`;
        const initialRow = initialData.find(r => r.MENUID === row.MENUID);
        if (!initialRow) return;
        
        const updatedRow = updateAuthYn(row, authName, checked ? "Y" : "N");
        const currentAuth = updatedRow.children.find(c => c.AUTHNM === authName);
        const initialAuth = initialRow.children.find(c => c.AUTHNM === authName);
        const isChanged = currentAuth && initialAuth && currentAuth.AUTHYN !== initialAuth.AUTHYN;

        if (isChanged) {
          newChangedCells.set(key, true);
        } else {
          newChangedCells.delete(key);
        }
      });
      return newChangedCells;
    });
  };

  const handleReset = () => {
    fetchMenuAuthData();
    setChangedCells(new Map());
  };

  const handleCheckboxChange = (menuId) => {
    setChangedCells(prev => {
      const newChangedCells = new Map(prev);
      const hasChanges = authFields.some(authName => 
        newChangedCells.has(`${menuId}-${authName}`)
      );
      
      if (hasChanges) {
        authFields.forEach(authName => {
          const key = `${menuId}-${authName}`;
          if (newChangedCells.has(key)) {
            newChangedCells.delete(key);
          } else if (isCellChanged(menuId, authName)) {
            newChangedCells.set(key, true);
          }
        });
      }
      return newChangedCells;
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const saveData = [];
    const changedRows = new Set();

    changedCells.forEach((_, key) => {
      const [menuId, authName] = key.split('-');
      if (isRowChanged(menuId)) {
        changedRows.add(menuId);
        const row = data.find(r => r.MENUID === menuId);
        if (row) {
          const auth = row.children.find(c => c.AUTHNM === authName);
          if (auth) {
            saveData.push({
              pGUBUN: 'U',
              pAUTHID: auth.AUTHID,
              pMENUID: row.MENUID,
              pUSEYN: auth.AUTHYN
            });
          }
        }
      }
    });

    if (saveData.length === 0) {
      errorMsgPopup("변경된 데이터가 없습니다.");
      return;
    }

    setLoading(true);

    try {
      const promises = saveData.map(async (item) => {
        const params = {
          pGUBUN: item.pGUBUN,
          pAUTHID: item.pAUTHID,
          pMENUID: item.pMENUID,
          pUSEYN: item.pUSEYN
        };

        try {
          const response = await fetchData("oper/menuauthinfo/save", params );

          if (!response.success) {
            throw new Error(response.message || `Failed to update menu auth ${item.pMENUID}-${item.pAUTHID}`);
          }

          return { ...item, success: true };
        } catch (error) {
          console.error(`Error processing update for MENUID: ${item.pMENUID}, AUTHID: ${item.pAUTHID}`, error);
          return { ...item, success: false, error: error.message };
        }
      });

      const results = await Promise.all(promises);

      const errors = results.filter((result) => !result.success);
      if (errors.length > 0) {
        errorMsgPopup(`일부 작업이 실패했습니다: ${errors.map((e) => e.error).join(", ")}`);
      } else {
        msgPopup("모든 변경사항이 성공적으로 저장되었습니다.");
        await fetchMenuAuthData();
      }
    } catch (err) {
      console.error("Save operation failed:", err);
      errorMsgPopup(err.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`container mt-1 ${styles.container}`}>
      <div className="btn-group-custom d-flex justify-content-end gap-2 mb-3">
        <button className={`btn text-bg-secondary ${styles.btnCancel}`} onClick={handleReset}>초기화</button>
        <button className={`btn text-bg-success ${styles.btnReg}`} onClick={handleSave} disabled={loading}>
          {loading ? "저장 중..." : "저장"}
        </button>
      </div>

      <div className={`table-responsive ${styles.tableResponsive}`}>
        <table className={`table table-bordered ${styles.table}`}>
          <thead className={styles.stickyTop}>
            <tr>
              <th className={`${styles.textCenter} ${styles.stickyColumn}`}>목차관리</th>
              <th className={`${styles.textCenter} ${styles.stickyColumn2}`}>작업대상</th>
              {authFields.map((authName) => (
                <th key={authName} className={styles.textCenter}>
                  {authName}
                  <div className="form-check d-flex justify-content-center mt-1">
                    <input
                      type="checkbox"
                      className={styles.formCheckInput}
                      onChange={(e) => handleSelectAll(authName, e.target.checked)}
                      checked={Array.isArray(data) && data.length > 0 && data.every((row) => getAuthYn(row, authName) === "Y")}
                      disabled={!Array.isArray(data) || data.length === 0}
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.isArray(data) && data.length > 0 ? (
              data.map((row) => (
                <tr key={row.MENUID}>
                  <td className={`${styles.textLeft} ${styles.stickyColumn}`}>
                    <span>{formatMenuName(row.MENUNM, row.MENULEVEL)}</span>
                  </td>
                  <td className={`${styles.textCenter} ${styles.stickyColumn2}`}>
                    <input
                      type="checkbox"
                      className={styles.formCheckInput}
                      checked={isRowChanged(row.MENUID)}
                      onChange={() => handleCheckboxChange(row.MENUID)}
                    />
                  </td>
                  {authFields.map((authName) => (
                    <td
                      key={authName}
                      className={`${styles.textCenter} ${changedCells.has(`${row.MENUID}-${authName}`) ? styles.changedCell : ''}`}
                    >
                      <div className="d-flex justify-content-center gap-2">
                        <div className={`form-check form-check-inline ${styles.formCheckInline}`}>
                          <input
                            type="radio"
                            className={styles.formCheckInput}
                            name={`${authName}-${row.MENUID}`}
                            value="Y"
                            checked={getAuthYn(row, authName) === "Y"}
                            onChange={() => handleRadioChange(row.MENUID, authName, "Y")}
                          />
                          <label className="form-check-label">Y</label>
                        </div>
                        <div className={`form-check form-check-inline ${styles.formCheckInline}`}>
                          <input
                            type="radio"
                            className={styles.formCheckInput}
                            name={`${authName}-${row.MENUID}`}
                            value="N"
                            checked={getAuthYn(row, authName) === "N"}
                            onChange={() => handleRadioChange(row.MENUID, authName, "N")}
                          />
                          <label className="form-check-label">N</label>
                        </div>
                      </div>
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={authFields.length + 2} className={styles.textCenter}>
                  데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MenuAuthInfo;
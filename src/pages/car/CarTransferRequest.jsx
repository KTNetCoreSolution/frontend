import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useStore from '../../store/store.js';
import CommonPopup from '../../components/popup/CommonPopup.jsx';
import OrgSearchPopup from '../../components/popup/OrgSearchPopup.jsx';
import styles from './CarTransferRequest.module.css';
import { fetchData } from '../../utils/dataUtils.js';
import { hasPermission } from '../../utils/authUtils.js';
import { errorMsgPopup } from '../../utils/errorMsgPopup.js';
import { msgPopup } from '../../utils/msgPopup.js';
import { arEG, tr } from 'date-fns/locale';
import js from '@eslint/js';


const CarTransferRequest = () => {
  const { user } = useStore();
  const { state } = useLocation();
  const { clearUser } = useStore();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [reqOrgData, setReqOrgData] = useState({ORGGROUP: '', ORGCD: ''});
  const [orgNmInfo, setOrgNmInfo] = useState({ORGNM1: '', ORGNM2: '', ORGNM3: '', ORGNM4: ''});
  const [showOrgPopup, setShowOrgPopup] = useState(false);

  // Tabulator 테이블 초기화
  /**
   * Tabulator 테이블을 초기화하고, 컴포넌트 언마운트 시 정리
   * @async
   */
  useEffect(() => {
    const initializeComponent = async () => {
      // 다른 컴포넌트 렌더링 대기
      await new Promise((resolve) => setTimeout(resolve, 300));

      try {
        const reqData = state?.reqData || [];

        if (reqData.length === 0) {
          msgPopup('이관할 차량을 선택해주세요.');
          navigate(-1);
          return;
        } else { 
          setData(reqData);
        }
      } catch (err) {
        console.error("UI 초기화 실패:", err.message);
        navigate(-1);
        return;
      }
    };

    initializeComponent();

    // 컴포넌트 언마운트 시 테이블 정리
    return () => {
    };
  }, []);

  const validateForm = () => {
    if(reqOrgData.ORGGROUP === '' || reqOrgData.ORGCD === '') {
      return "이관받을 기관을 선택해주세요.";
    }

    return '';
  };

  const handleRequest = async (e) => {
    const validationError = validateForm();

    if (validationError) {
      errorMsgPopup(validationError);
      return;
    }

    if(confirm("동일한 조직으로 변경 건은 이관요청에서 제외됩니다. 이관요청 하시겠습니까?")) {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 0));

      try {
        const carIds = data.filter(item => item.ORGCD !== reqOrgData.ORGCD).map(item => item.CARID).join('^');

        const params = {
          pCARID: carIds,
          pORGGROUP: reqOrgData.ORGGROUP,
          pORGCD: reqOrgData.ORGCD,
          pEMPNO: user.empNo
        };

        const response = await fetchData("car/requestCarTransfer", params);

        if (!response.success) {
          errorMsgPopup(response.message || "이관요청 중 오류가 발생했습니다.");
          return;
        } else {
          if (response.errMsg !== '' || response.data[0].errCd !== '00') {
            let errMsg = response.errMsg;

            if (response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;

            errorMsgPopup(errMsg);
          } else {
            msgPopup("차량이관 요청이 완료되었습니다.");
            navigate(-1);
            return;
          }
        }
      } catch (err) {
        errorMsgPopup(err.response?.data?.message || "이관요청 중 오류가 발생했습니다.");
        return;
      } finally {
        setLoading(false);      
      }
    }
    else {
      return;
    }
  }

  const handleClose = () => {
    navigate(-1);
  }

  const selectOrgNm = async (orgCd) => {
    setLoading(true);
    
    await new Promise((resolve) => setTimeout(resolve, 0));

    try {
      const params = {pORGCD: orgCd, pDEBUG: "F"};

      const response = await fetchData("car/orgNmInfo", params);
      if (!response.success) {
        errorMsgPopup(response.message || "데이터를 가져오는 중 오류가 발생했습니다.");
        return;
      }
      if (response.errMsg !== "") {
        console.log(response.errMsg);
        return;
      }
    
      const orgNm0 = response.data[0]?.ORGNMLV0 || '';
      const orgNm1 = response.data[0]?.ORGNMLV1 || '';
      const orgNm2 = response.data[0]?.ORGNMLV2 || '';
      const orgNm3 = response.data[0]?.ORGNMLV3 || '';
      const orgNm4 = response.data[0]?.ORGNMLV4 || '';
      
      if (orgNm1 === '') {
        setOrgNmInfo({ORGNM1: orgNm0, ORGNM2: '', ORGNM3: '', ORGNM4: ''});
      }
      else {
        setOrgNmInfo({ORGNM1: orgNm1, ORGNM2: orgNm2, ORGNM3: orgNm3, ORGNM4: orgNm4});
      }
    } catch (err) {
      errorMsgPopup(err.response?.data?.message || "데이터를 가져오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
    setReqOrgData({ ...reqOrgData, ORGCD: orgCd });
  };

  return (
    <div className={styles.container}>
      <div className={styles.noteSection}>
        <span>이관차량정보</span>
        <div className={styles.inputButtonWrapper}>
          <button className={`btn text-bg-success`} onClick={() => handleRequest()}>이관요청</button>
          <button className={`btn text-bg-secondary`} onClick={() => handleClose()}>돌아가기</button>
        </div>
      </div>
      {data.map((item) => 
        <table className={styles.formTable}>
          <colgroup>
            <col className={styles.td1}/>
            <col className={styles.td2}/>
            <col className={styles.td1}/>
            <col className={styles.td2}/>
            <col className={styles.td1}/>
            <col className={styles.td2}/>
            <col className={styles.td1}/>
            <col className={styles.td2}/>
          </colgroup>
          <tbody>
            <tr>
              <td>임대여부</td>
              <td>{item.RENTALTYPE}</td>
              <td>차대번호</td>
              <td>{item.CARID}</td>
              <td>차량번호</td>
              <td>{item.CARNO}</td>
              <td>운용관리상태</td>
              <td>{item.MGMTSTATUS}</td>
            </tr>
            <tr>
              <td>차종</td>
              <td>{item.CARTYPE}</td>
              <td>차형</td>
              <td>{item.CARCLASS}</td>
              <td>규모</td>
              <td>{item.CARSIZE}</td>
              <td>차명</td>
              <td>{item.CARNM}</td>
            </tr>
            <tr>
              <td>사용연료</td>
              <td>{item.USEFUEL}</td>
              <td>차량취득일</td>
              <td>{item.CARACQUIREDDT}</td>
              <td>운전자(정)</td>
              <td>{item.PRIMARY_MANAGER_EMPNM}</td>
              <td>조직</td>
              <td>{item.ORG_GROUP}</td>
            </tr>
            <tr>
              <td>본부</td>
              <td>{item.ORGNMLV1}</td>
              <td>설계부/운용센터</td>
              <td>{item.ORGNMLV2}</td>
              <td>부</td>
              <td>{item.ORGNMLV3}</td>
              <td>팀</td>
              <td>{item.ORGNMLV4}</td>
            </tr>
          </tbody>
        </table>
      )}
      <div className={styles.noteSection} style={{width: '40%', marginTop: '40px', marginLeft: '40%'}}>
        <span>이관받을 기관</span>
      </div>
      <table className={styles.formTable} style={{width: '40%', marginLeft: '40%'}}>
        <tbody>
          <tr>
            <td className={styles.td1}>조직</td>
            <td colSpan={3} className={styles.td3}>
              <div className={styles.inputButtonWrapper}>
                <select className={`form-select ${styles.select}`} onChange={(e) => {setReqOrgData({ ...reqOrgData, ORGGROUP: e.target.value })}} >
                  <option value="">조직을 선택하세요</option>
                  {['본사', 'Biz', '선로', '설계', '인프라운용본부', '재배치'].map((type) => (<option key={type} value={type}>{type}</option>))}
                </select>
                <button type="button" className={`btn btn-secondary ${styles.btn}`} onClick={(e) => {setShowOrgPopup(true)}}>선택</button>
              </div>
            </td>
          </tr>
          <tr>
            <td className={styles.td4}>본부</td>
            <td className={styles.td2}>{orgNmInfo.ORGNM1}</td>
            <td className={styles.td1}>설계부/운용센터</td>
            <td className={styles.td2}>{orgNmInfo.ORGNM2}</td>
          </tr>
          <tr>
            <td className={styles.td1}>부</td>
            <td className={styles.td2}>{orgNmInfo.ORGNM3}</td>
            <td className={styles.td1}>팀</td>
            <td className={styles.td2}>{orgNmInfo.ORGNM4}</td>
          </tr>
        </tbody>
      </table>
      <CommonPopup show={showOrgPopup} onHide={() => setShowOrgPopup(false)} title={'조직 선택'}>
        <div>
          <OrgSearchPopup
            onClose={() => setShowOrgPopup(false)}
            onConfirm={(selectedRows) => {
              const orgNm = selectedRows.length > 0 ? selectedRows[0].ORGNM : ''
              const orgCd = selectedRows.length > 0 ? selectedRows[0].ORGCD : ''
              
              selectOrgNm(orgCd);
            }} 
            pGUBUN="CAROPEREMPNO" //차량용 트리 시(_fix 테이블 사용)
            isMulti={false}
            initialSelectedOrgs={""} //초기 선택된 조직
            isChecked={true} //체크박스 사용 여부
          />
        </div>
      </CommonPopup>
      <div className={styles.tableWrapper}>
        {loading && <div>로딩 중...</div>}
        <div
          className={styles.tableSection}
          style={{ visibility: loading ? 'hidden' : 'visible' }}
        />
      </div>
    </div>
  );
};

export default CarTransferRequest;
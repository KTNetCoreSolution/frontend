import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../../store/store';
import Modal from 'react-bootstrap/Modal';
import MobileMainUserMenu from '../../components/mobile/MobileMainUserMenu';
import MobileOcrCamera from './MobileOcrCamera';

const MobileOdometerReader = () => {
  const { user, clearUser } = useStore();
  const navigate = useNavigate();

  const [showSidebar, setShowSidebar] = useState(false);
  const [odometerValue, setOdometerValue] = useState('');
  const [showOcrModal, setShowOcrModal] = useState(false);

  const handleToggleSidebar = () => setShowSidebar(prev => !prev);

  const handleLogout = () => {
    clearUser();
    navigate('/mobile/login');
  };

  const handleOcrSuccess = (text) => {
    setShowOcrModal(false);
    setOdometerValue(text);
  };

  return (
    <div className="container-fluid p-0">
      <header className="header">
        <h1 className="h5 mb-0">주행거리 입력</h1>
        <button className="btn text-white" onClick={handleToggleSidebar}>
          <i className="bi bi-list"></i>
        </button>
      </header>
      <MobileMainUserMenu show={showSidebar} handleClose={handleToggleSidebar} onLogout={handleLogout} />

      <div className="pageMain">
        <div className="bg-white rounded-3 shadow-sm p-4 mb-3">
          <div className="d-flex align-items-center justify-content-between">
            <div className="flex-fill me-3">
              <input
                type="number"
                value={odometerValue}
                onChange={(e) => setOdometerValue(e.target.value.replace(/\D/g, ''))}
                placeholder="0"
                className="form-control form-control-lg text-center fw-bold"
                style={{ 
                  fontSize: '2rem',
                  border: '3px solid #00c4b4',
                  borderRadius: '15px'
                }}
              />
            </div>
            <button
              className="btn btn-primary d-flex align-items-center justify-content-center shadow-lg"
              onClick={() => setShowOcrModal(true)}
              style={{ width: '30px', height: '30px' }}
            >
              <i className="bi bi-camera-fill fs-2"></i>
            </button>
          </div>
        </div>

        {/* 현재 값 크게 표시 */}
        <div className="text-center py-5 bg-white rounded-3 shadow-sm">
          {odometerValue ? (
            <>
              <div className="display-3 fw-bold text-primary">{odometerValue}</div>
              <div className="fs-3 text-muted">km</div>
            </>
          ) : (
            <div className="text-muted fs-4">
              주행거리를 입력하거나<br/>
              카메라 버튼을 눌러 촬영해주세요
            </div>
          )}
        </div>

        {/* 등록 버튼 */}
        <div className="mt-4">
          <button 
            className="btn btn-lg w-100 fw-bold py-3 rounded-pill shadow-lg"
            style={{ backgroundColor: '#00c4b4', color:'#fff', border: 'none' }}
          >
            등록하기
          </button>
        </div>
      </div>

      {/* OCR 카메라 모달 */}
      <Modal
        show={showOcrModal}
        onHide={() => setShowOcrModal(false)}
        fullscreen
        className="modal-fullscreen"
      >
        <Modal.Body className="p-0">
          <MobileOcrCamera
            onSuccess={handleOcrSuccess}
            onClose={() => setShowOcrModal(false)}
          />
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default MobileOdometerReader;
import React, { useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import useStore from '../../../store/store';
import { hasPermission } from '../../../utils/authUtils';
import Board from '../Board';
import styles from './BoardPopup.module.css';
import BoardWritePopup from './BoardWritePopup';
import BoardViewPopup from './BoardViewPopup';

const BoardMainPopup = ({ show, onHide, type = 'notice' }) => {
  const { user } = useStore();
  const canWriteBoard = user && hasPermission(user.auth, 'mainBoard');
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState(null);

  const handleWrite = (type) => {
    setSelectedNotice({ type });
    setShowWriteModal(true);
  };

  const handleView = (noticeid, type) => {
    setSelectedNotice({ noticeid, type });
    setShowViewModal(true);
  };

  const handleEdit = (notice, files) => {
    setShowViewModal(false);
    setSelectedNotice({ type: selectedNotice?.type, notice, files });
    setShowWriteModal(true);
  };

  const textMap = {
    notice: '표준활동 공지사항',
    notice2: '표준활동 패치내역',
    carnotice: '차량 공지사항',
    carnotice2: '차량 과태료',
  };

  return (
    <Modal show={show} onHide={onHide} centered dialogClassName={styles.customModal}>
      <Modal.Header closeButton>
        <Modal.Title>
          {textMap[type] || '공지사항'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className={styles.modalBody}>
        <div className={styles.boardContainer}>
          <Board
            canWriteBoard={canWriteBoard}
            type={type}
            onWrite={handleWrite}
            onView={handleView}
            showHeader={true} // 등록 버튼 표시
          />
        </div>
      </Modal.Body>

      {showWriteModal && (
        <BoardWritePopup
          show={showWriteModal}
          onHide={() => setShowWriteModal(false)}
          notice={selectedNotice?.notice}
          files={selectedNotice?.files || []}
          type={selectedNotice?.type}
        />
      )}
      {showViewModal && selectedNotice?.noticeid && (
        <BoardViewPopup
          show={showViewModal}
          onHide={() => setShowViewModal(false)}
          noticeid={selectedNotice?.noticeid}
          type={selectedNotice?.type}
          onEdit={(notice, files) => handleEdit(notice, files)}
        />
      )}
    </Modal>
  );
};

export default BoardMainPopup;
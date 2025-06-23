import React from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

const ImageViewPopup = ({ imageSrc, fileName, onClose, zoomLevel, onZoomIn, onZoomOut }) => {
  return (
    <Modal show={true} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>{fileName}</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ textAlign: 'center', padding: '20px' }}>
        <img
          src={imageSrc}
          alt={fileName}
          style={{
            maxWidth: '100%',
            maxHeight: '80vh',
            transform: `scale(${zoomLevel})`,
            transition: 'transform 0.2s',
          }}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onZoomOut}>
          축소
        </Button>
        <Button variant="secondary" onClick={onZoomIn}>
          확대
        </Button>
        <Button variant="primary" onClick={onClose}>
          닫기
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ImageViewPopup;
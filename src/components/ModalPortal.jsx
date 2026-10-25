// src/components/ModalPortal.jsx
// Universal portal wrapper — renders modals into document.body so they always
// appear centred on the viewport regardless of parent overflow/z-index context.
import { createPortal } from 'react-dom';

export const ModalPortal = ({ children }) => {
  return createPortal(children, document.body);
};

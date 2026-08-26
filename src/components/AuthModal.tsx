import { Modal } from "./Modal";
import { AuthForm } from "./AuthForm";

export const AuthModal = ({ onClose }: { onClose: () => void }) => (
  <Modal title="Tu cuenta" emoji="👤" onClose={onClose}>
    <div className="px-5 pb-5 pt-4">
      <AuthForm onSuccess={onClose} />
      <p className="mt-3 text-xs text-slate-500">
        Con cuenta, tu mazo y tu progreso se guardan en el servidor y te siguen entre dispositivos.
      </p>
    </div>
  </Modal>
);

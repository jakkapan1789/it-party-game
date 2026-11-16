import type { FormEvent, ReactNode } from 'react';
import { motion } from 'framer-motion';

interface Props {
  /** Omit for a display-only panel (renders a div instead of a form). */
  onSubmit?: (e: FormEvent) => void;
  delay: number;
  children: ReactNode;
  footer: ReactNode;
}

/** The join form (or, without onSubmit, a read-only copy of it), floating straight on the painted scene, fields staggered in. */
export function RegistrationPanel({ onSubmit, delay, children, footer }: Props) {
  const Tag = onSubmit ? motion.form : motion.div;
  const formProps = onSubmit ? { id: 'join-form', onSubmit, noValidate: true } : {};
  return (
    <Tag
      {...formProps}
      className="reg-panel"
      initial={{ opacity: 0, y: 36, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="reg-content">
        <motion.div
          className="reg-fields"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { delayChildren: delay + 0.25, staggerChildren: 0.1 } } }}
        >
          {children}
        </motion.div>
        <motion.div className="reg-footer" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay + 0.5, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
          {footer}
        </motion.div>
      </div>
    </Tag>
  );
}

/** Stagger child for the panel. */
export function PanelItem({ children }: { children: ReactNode }) {
  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } }}>
      {children}
    </motion.div>
  );
}

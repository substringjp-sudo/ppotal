import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface DashboardPageHeaderProps {
  title: ReactNode;
  description: string;
  actionButton?: ReactNode;
}

export default function DashboardPageHeader({
  title,
  description,
  actionButton,
}: DashboardPageHeaderProps) {
  return (
    <section className="mb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
            {title}
          </h1>
          <p className="text-sm text-slate-400 font-bold mt-1 tracking-tight">
            {description}
          </p>
        </motion.div>

        {actionButton && (
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            {actionButton}
          </motion.div>
        )}
      </div>
    </section>
  );
}

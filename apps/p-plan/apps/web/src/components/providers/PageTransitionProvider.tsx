'use client';

import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { PAGE_TRANSITION_VARIANTS } from '@/lib/animations';

export default function PageTransitionProvider({
    children
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    return (
        <motion.div
            key={pathname}
            initial="initial"
            animate="animate"
            variants={PAGE_TRANSITION_VARIANTS}
            className="w-full flex-1 flex flex-col"
        >
            {children}
        </motion.div>
    );
}

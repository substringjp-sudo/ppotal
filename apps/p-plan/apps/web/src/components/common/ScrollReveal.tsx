'use client';

import { motion } from 'framer-motion';
import { ANIMATION_EASE } from '@/lib/animations';

interface ScrollRevealProps {
  children: React.ReactNode;
  width?: "fit-content" | "100%";
  direction?: "up" | "down" | "left" | "right";
  delay?: number;
  duration?: number;
  distance?: number;
  className?: string;
}

export default function ScrollReveal({
  children,
  width = "100%",
  direction = "up",
  delay = 0,
  duration = 0.5,
  distance = 20,
  className
}: ScrollRevealProps) {
  
  const getInitialProps = () => {
    switch (direction) {
      case "up": return { y: distance, opacity: 0 };
      case "down": return { y: -distance, opacity: 0 };
      case "left": return { x: distance, opacity: 0 };
      case "right": return { x: -distance, opacity: 0 };
      default: return { y: distance, opacity: 0 };
    }
  };

  return (
    <motion.div
      className={className}
      initial={getInitialProps()}
      whileInView={{ x: 0, y: 0, opacity: 1 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{
        duration: duration,
        delay: delay,
        ease: ANIMATION_EASE
      }}
      style={{ width }}
    >
      {children}
    </motion.div>
  );
}

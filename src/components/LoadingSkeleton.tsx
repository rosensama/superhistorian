"use client";

import { motion } from "framer-motion";

export default function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-white/50 border-2 border-sepia/10 rounded-2xl p-5 space-y-3"
        >
          <div className="flex gap-2">
            <div className="h-5 w-16 bg-sepia/10 rounded-full animate-pulse" />
            <div className="h-5 w-4 bg-sepia/5 rounded-sm" />
            <div className="h-5 w-16 bg-sepia/10 rounded-full animate-pulse" />
          </div>
          <div className="h-6 w-3/4 bg-sepia/15 rounded-sm animate-pulse" />
          <div className="h-4 w-1/3 bg-sepia/10 rounded-sm animate-pulse" />
          <div className="space-y-2">
            <div className="h-3 w-full bg-sepia/10 rounded-sm animate-pulse" />
            <div className="h-3 w-5/6 bg-sepia/10 rounded-sm animate-pulse" />
            <div className="h-3 w-4/6 bg-sepia/10 rounded-sm animate-pulse" />
          </div>
          <div className="flex gap-2 pt-2">
            <div className="h-8 flex-1 bg-navy/10 rounded-lg animate-pulse" />
            <div className="h-8 flex-1 bg-crimson/10 rounded-lg animate-pulse" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

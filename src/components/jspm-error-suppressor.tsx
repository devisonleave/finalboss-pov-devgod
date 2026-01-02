"use client";

import { useEffect } from "react";

export function JSPMErrorSuppressor() {
  useEffect(() => {
    const suppressError = (e: string | Event): boolean => {
      const str = String(e);
      return (
        str.includes("[object Event]") ||
        str.includes("WebSocket") ||
        str.includes("jsprintmanager") ||
        str.includes("JSPrintManager") ||
        str.includes("ws://") ||
        str.includes("wss://")
      );
    };

    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      const firstArg = args[0];
      if (firstArg && suppressError(String(firstArg))) return;
      if (firstArg instanceof Event) return;
      originalConsoleError.apply(console, args);
    };

    const errorHandler = (event: ErrorEvent) => {
      if (
        suppressError(event.message || "") ||
        suppressError(event.filename || "") ||
        event.error instanceof Event
      ) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return false;
      }
    };

    const rejectionHandler = (event: PromiseRejectionEvent) => {
      if (suppressError(String(event.reason)) || event.reason instanceof Event) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("error", errorHandler, true);
    window.addEventListener("unhandledrejection", rejectionHandler, true);

    return () => {
      console.error = originalConsoleError;
      window.removeEventListener("error", errorHandler, true);
      window.removeEventListener("unhandledrejection", rejectionHandler, true);
    };
  }, []);

  return null;
}

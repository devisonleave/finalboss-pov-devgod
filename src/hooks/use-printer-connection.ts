// Sonakshi Boutique POS - Printer Connection Hook
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { PrinterStatus } from "@/lib/tspl-printer";

function suppressJSPMErrors() {
  if (typeof window === "undefined") return;
  
  const originalOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    const sourceStr = source || "";
    const messageStr = String(message || "");
    
    if (
      sourceStr.includes("jsprintmanager") ||
      sourceStr.includes("JSPrintManager") ||
      messageStr.includes("[object Event]") ||
      messageStr.includes("WebSocket") ||
      error instanceof Event
    ) {
      return true;
    }
    
    if (originalOnError) {
      return originalOnError.call(window, message, source, lineno, colno, error);
    }
    return false;
  };
}

if (typeof window !== "undefined") {
  suppressJSPMErrors();
}

export function usePrinterConnection() {
  const [status, setStatus] = useState<PrinterStatus>("not_installed");
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const hasInitialized = useRef(false);

  useEffect(() => {
    suppressJSPMErrors();
    
    const handleError = (event: ErrorEvent) => {
      if (
        event.message?.includes("[object Event]") ||
        event.message?.includes("WebSocket") ||
        event.filename?.includes("jsprintmanager") ||
        event.filename?.includes("JSPrintManager")
      ) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return true;
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = String(event.reason || "");
      if (
        event.reason instanceof Event || 
        reason.includes("WebSocket") ||
        reason.includes("jsprintmanager")
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener("error", handleError, true);
    window.addEventListener("unhandledrejection", handleUnhandledRejection, true);

    return () => {
      window.removeEventListener("error", handleError, true);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection, true);
    };
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const { initializePrintManager, getInstalledPrinters } = await import("@/lib/print-manager");
      const newStatus = await initializePrintManager();
      setStatus(newStatus);

      if (newStatus === "connected") {
        const installedPrinters = await getInstalledPrinters();
        setPrinters(installedPrinters);
        
        const tscPrinter = installedPrinters.find(
          (p) => p.toLowerCase().includes("tsc") || p.toLowerCase().includes("te244")
        );
        if (tscPrinter && !selectedPrinter) {
          setSelectedPrinter(tscPrinter);
        }
      }
    } catch {
      setStatus("not_installed");
    } finally {
      setIsLoading(false);
    }
  }, [selectedPrinter]);

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      const timer = setTimeout(() => {
        refresh();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [refresh]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const { getPrinterStatus } = await import("@/lib/print-manager");
        const currentStatus = await getPrinterStatus();
        setStatus(currentStatus);
      } catch {
        setStatus("not_installed");
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return {
    status,
    printers,
    selectedPrinter,
    setSelectedPrinter,
    isLoading,
    refresh,
  };
}

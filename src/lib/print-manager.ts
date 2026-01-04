"use client";

import type { PrinterStatus, PrintResult } from "./tspl-printer";

let JSPM: typeof import("jsprintmanager") | null = null;
let initPromise: Promise<PrinterStatus> | null = null;
let resolved = false;
let globalErrorHandlerInstalled = false;

function installGlobalErrorHandler() {
  if (globalErrorHandlerInstalled || typeof window === "undefined") return;
  globalErrorHandlerInstalled = true;

  const suppressError = (e: Event | ErrorEvent | PromiseRejectionEvent | string): boolean => {
    const str = String(e);
    if (
      str.includes("[object Event]") ||
      str.includes("WebSocket") ||
      str.includes("jsprintmanager") ||
      str.includes("JSPrintManager") ||
      str.includes("ws://") ||
      str.includes("wss://")
    ) {
      return true;
    }
    if (e instanceof Event) {
      const evt = e as ErrorEvent;
      if (evt.filename?.includes("jsprintmanager") || evt.filename?.includes("JSPrintManager")) {
        return true;
      }
      if (evt.message?.includes("[object Event]") || evt.message?.includes("WebSocket")) {
        return true;
      }
    }
    return false;
  };

  const originalConsoleError = console.error;
  console.error = (...args) => {
    const firstArg = args[0];
    if (firstArg && suppressError(String(firstArg))) {
      return;
    }
    if (firstArg instanceof Event) {
      return;
    }
    originalConsoleError.apply(console, args);
  };

  window.addEventListener("error", (event) => {
    if (suppressError(event) || suppressError(event.message || "") || suppressError(event.filename || "")) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return false;
    }
  }, true);

  window.addEventListener("unhandledrejection", (event) => {
    if (suppressError(String(event.reason)) || event.reason instanceof Event) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
}

if (typeof window !== "undefined") {
  installGlobalErrorHandler();
}

async function loadJSPM() {
  if (typeof window === "undefined") return null;
  
  installGlobalErrorHandler();
  
  if (JSPM) return JSPM;
  
  try {
    JSPM = await import("jsprintmanager");
    return JSPM;
  } catch {
    return null;
  }
}

export async function initializePrintManager(): Promise<PrinterStatus> {
  if (typeof window === "undefined") return "not_installed";
  
  installGlobalErrorHandler();
  
  if (initPromise && !resolved) return initPromise;
  
  const jspm = await loadJSPM();
  if (!jspm) return "not_installed";

  initPromise = new Promise((resolve) => {
    resolved = false;
    
    const safeResolve = (status: PrinterStatus) => {
      if (!resolved) {
        resolved = true;
        resolve(status);
      }
    };

    try {
      // Enable auto reconnect to make the connection more stable
      jspm.JSPrintManager.auto_reconnect = true;
      
      jspm.JSPrintManager.start()
        .then(() => {
          const checkConnection = (attempts: number) => {
            if (resolved) return;
            if (attempts <= 0) {
              // If we still haven't connected after all attempts, resolve as disconnected
              // but auto_reconnect will keep trying in the background
              safeResolve("disconnected");
              return;
            }
            
            try {
              if (jspm.JSPrintManager.websocket_status === jspm.WSStatus.Open) {
                safeResolve("connected");
              } else {
                // Wait longer between attempts as JSPM can take a few seconds
                setTimeout(() => checkConnection(attempts - 1), 1000);
              }
            } catch {
              safeResolve("not_installed");
            }
          };
          
          // Initial wait before first check
          setTimeout(() => checkConnection(10), 500);
        })
        .catch(() => {
          safeResolve("not_installed");
        });

      // Increased global timeout to 12 seconds to give more time for connection
      setTimeout(() => {
        safeResolve("disconnected");
      }, 12000);
    } catch {
      safeResolve("not_installed");
    }
  });
  
  return initPromise;
}

export async function getPrinterStatus(): Promise<PrinterStatus> {
  const jspm = await loadJSPM();
  if (!jspm) return "not_installed";

  try {
    if (jspm.JSPrintManager.websocket_status === jspm.WSStatus.Open) {
      return "connected";
    } else if (jspm.JSPrintManager.websocket_status === jspm.WSStatus.Closed) {
      return "disconnected";
    }
    return "checking";
  } catch {
    return "not_installed";
  }
}

export async function getInstalledPrinters(): Promise<string[]> {
  const jspm = await loadJSPM();
  if (!jspm) return [];

  try {
    if (jspm.JSPrintManager.websocket_status !== jspm.WSStatus.Open) {
      await initializePrintManager();
    }
    const printers = await jspm.JSPrintManager.getPrinters();
    return printers as string[];
  } catch {
    return [];
  }
}

export async function printRawTSPL(
  tsplCommands: string,
  printerName?: string
): Promise<PrintResult> {
  const jspm = await loadJSPM();
  if (!jspm) {
    return {
      success: false,
      message: "JSPrintManager not available. Please install the client app.",
    };
  }

  try {
    if (jspm.JSPrintManager.websocket_status !== jspm.WSStatus.Open) {
      const status = await initializePrintManager();
      if (status !== "connected") {
        return {
          success: false,
          message: "Printer service not connected. Please ensure JSPrintManager is running.",
        };
      }
    }

    const cpj = new jspm.ClientPrintJob();
    
    if (printerName) {
      cpj.clientPrinter = new jspm.InstalledPrinter(printerName);
    } else {
      cpj.clientPrinter = new jspm.DefaultPrinter();
    }

    cpj.printerCommands = tsplCommands;
    
    await cpj.sendToClient();

    return {
      success: true,
      message: "Print job sent successfully!",
    };
  } catch (error) {
    return {
      success: false,
      message: `Print failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

export function getJSPrintManagerDownloadUrl(): string {
  return "https://www.neodynamic.com/downloads/jspm/";
}

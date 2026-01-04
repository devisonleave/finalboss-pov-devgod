"use client";

import { Printer, RefreshCw, CheckCircle2, XCircle, AlertCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePrinterConnection } from "@/hooks/use-printer-connection";
import { getJSPrintManagerDownloadUrl } from "@/lib/print-manager";

export function PrinterStatusBar() {
  const { status, printers, selectedPrinter, setSelectedPrinter, isLoading, refresh } =
    usePrinterConnection();

  const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";

  const statusConfig = {
    checking: {
      icon: <RefreshCw className="h-4 w-4 animate-spin text-amber-400" />,
      text: "Checking...",
      color: "text-amber-400",
    },
    connected: {
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
      text: "Connected",
      color: "text-emerald-400",
    },
    disconnected: {
      icon: <XCircle className="h-4 w-4 text-red-400" />,
      text: "Disconnected",
      color: "text-red-400",
      tip: isSecure ? "Try visiting https://localhost:25443 to accept the certificate if the app is running." : "Ensure JSPrintManager app is running."
    },

    not_installed: {
      icon: <AlertCircle className="h-4 w-4 text-orange-400" />,
      text: "Not Installed",
      color: "text-orange-400",
    },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-700 bg-slate-900/50 p-3">
      <div className="flex items-center gap-2">
        <Printer className="h-5 w-5 text-slate-400" />
        <span className="text-sm font-medium text-slate-300">Printer:</span>
      </div>

      <div className="flex items-center gap-2">
        {config.icon}
        <span className={`text-sm font-medium ${config.color}`}>{config.text}</span>
      </div>

      {status === "connected" && printers.length > 0 && (
        <Select value={selectedPrinter} onValueChange={setSelectedPrinter}>
          <SelectTrigger className="w-[220px] h-9 text-sm bg-slate-800 border-slate-600 text-white">
            <SelectValue placeholder="Select printer" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {printers.map((printer) => (
              <SelectItem key={printer} value={printer} className="text-white">
                {printer}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {status === "not_installed" && (
        <a
          href={getJSPrintManagerDownloadUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-sm font-medium text-slate-900 hover:from-amber-600 hover:to-orange-600 transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Install Client
        </a>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={refresh}
        disabled={isLoading}
        className="ml-auto text-slate-400 hover:text-white hover:bg-slate-800"
      >
        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
      </Button>
    </div>
  );
}

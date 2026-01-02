"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { PrinterStatusBar } from "@/components/printer-status-bar";
import { usePrinterConnection } from "@/hooks/use-printer-connection";
import { generateTSPLCommands, type BarcodeLabel } from "@/lib/tspl-printer";
import { printRawTSPL, getJSPrintManagerDownloadUrl } from "@/lib/print-manager";
import { getItems } from "@/lib/store";
import { Item } from "@/lib/types";
import { toast } from "sonner";
import {
  Plus,
  Printer,
  Trash2,
  Minus,
  AlertTriangle,
  Download,
  Search,
  X,
  Check,
} from "lucide-react";

interface SelectedItem {
  item: Item;
  copies: number;
}

export default function LabelPrinterPage() {
  const { selectedPrinter, status } = usePrinterConnection();
  const [items, setItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showPrintConfirm, setShowPrintConfirm] = useState(false);
  const [pendingItem, setPendingItem] = useState<Item | null>(null);
  const [pendingCopies, setPendingCopies] = useState(1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadItems() {
      const data = await getItems();
      setItems(data);
    }
    loadItems();
  }, []);

  const filteredItems = searchQuery.trim()
    ? items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.barcode.includes(searchQuery) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleSelectItem = useCallback((item: Item) => {
    setPendingItem(item);
    setPendingCopies(1);
    setShowPrintConfirm(true);
    setSearchQuery("");
  }, []);

  const handleConfirmAdd = () => {
    if (!pendingItem) return;
    
    const existing = selectedItems.find(s => s.item.id === pendingItem.id);
    if (existing) {
      setSelectedItems(prev =>
        prev.map(s =>
          s.item.id === pendingItem.id
            ? { ...s, copies: s.copies + pendingCopies }
            : s
        )
      );
    } else {
      setSelectedItems(prev => [...prev, { item: pendingItem, copies: pendingCopies }]);
    }
    
    setShowPrintConfirm(false);
    setPendingItem(null);
    setPendingCopies(1);
    
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handlePrintNow = async () => {
    if (!pendingItem) return;
    
    setShowPrintConfirm(false);
    setIsPrinting(true);
    
    try {
      const labelsToExpand: BarcodeLabel[] = [];
      for (let i = 0; i < pendingCopies; i++) {
        labelsToExpand.push({
          barcode: pendingItem.barcode,
          productName: pendingItem.name,
          price: pendingItem.sellingPrice.toString(),
        });
      }
      
      const tsplCommands = generateTSPLCommands(labelsToExpand, 1);
      const result = await printRawTSPL(tsplCommands, selectedPrinter);
      
      if (result.success) {
        const strips = Math.ceil(pendingCopies / 2);
        toast.success(`Printed ${pendingCopies} label(s) on ${strips} strip(s)!`);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Print failed");
    } finally {
      setIsPrinting(false);
      setPendingItem(null);
      setPendingCopies(1);
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  };

  const removeSelectedItem = (itemId: string) => {
    setSelectedItems(prev => prev.filter(s => s.item.id !== itemId));
  };

  const updateCopies = (itemId: string, delta: number) => {
    setSelectedItems(prev =>
      prev.map(s =>
        s.item.id === itemId
          ? { ...s, copies: Math.max(1, Math.min(100, s.copies + delta)) }
          : s
      )
    );
  };

  const handlePrintAll = async () => {
    if (selectedItems.length === 0) {
      toast.error("No items selected");
      return;
    }

    setIsPrinting(true);
    try {
      const labelsToExpand: BarcodeLabel[] = [];
      for (const sel of selectedItems) {
        for (let i = 0; i < sel.copies; i++) {
          labelsToExpand.push({
            barcode: sel.item.barcode,
            productName: sel.item.name,
            price: sel.item.sellingPrice.toString(),
          });
        }
      }

      const tsplCommands = generateTSPLCommands(labelsToExpand, 1);
      const result = await printRawTSPL(tsplCommands, selectedPrinter);

      if (result.success) {
        const totalLabels = labelsToExpand.length;
        const strips = Math.ceil(totalLabels / 2);
        toast.success(`Printed ${totalLabels} label(s) on ${strips} strip(s)!`);
        setSelectedItems([]);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Print failed");
    } finally {
      setIsPrinting(false);
    }
  };

  const totalLabels = selectedItems.reduce((sum, s) => sum + s.copies, 0);
  const totalStrips = Math.ceil(totalLabels / 2);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Label Printer</h1>
          <p className="text-slate-400 mt-1">Search items and print barcode labels</p>
        </div>
      </div>

      <div className="mb-6">
        <PrinterStatusBar />
      </div>

      {status === "not_installed" && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-amber-400">Client App Required</h3>
              <p className="text-sm text-slate-300 mt-1">
                Install JSPrintManager for direct printing to thermal printers.
              </p>
              <a
                href={getJSPrintManagerDownloadUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 rounded-lg text-sm font-semibold hover:from-amber-600 hover:to-orange-600 transition-colors"
              >
                <Download className="h-4 w-4" />
                Download JSPrintManager
              </a>
            </div>
          </div>
        </div>
      )}

      <Dialog open={showPrintConfirm} onOpenChange={setShowPrintConfirm}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">Print Labels for Item</DialogTitle>
          </DialogHeader>
          {pendingItem && (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <p className="font-medium text-white text-lg">{pendingItem.name}</p>
                <p className="text-sm text-slate-400 font-mono mt-1">{pendingItem.barcode}</p>
                <p className="text-amber-400 font-semibold mt-2">Rs. {pendingItem.sellingPrice}</p>
              </div>
              
              <div>
                <Label className="text-slate-300 mb-2 block">How many labels to print?</Label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPendingCopies(Math.max(1, pendingCopies - 1))}
                    className="h-12 w-12 border-slate-600 text-white"
                  >
                    <Minus className="h-5 w-5" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={pendingCopies}
                    onChange={(e) => setPendingCopies(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 h-12 text-center text-xl font-bold bg-slate-800 border-slate-600 text-white"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPendingCopies(Math.min(100, pendingCopies + 1))}
                    className="h-12 w-12 border-slate-600 text-white"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Will print on {Math.ceil(pendingCopies / 2)} strip(s) (2 labels per strip)
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={handleConfirmAdd}
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add to Queue
            </Button>
            <Button
              onClick={handlePrintNow}
              disabled={isPrinting || status !== "connected"}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-900 font-semibold"
            >
              <Printer className="h-4 w-4 mr-2" />
              {isPrinting ? "Printing..." : "Print Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Search className="h-5 w-5 text-amber-400" />
              Search Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <Input
                  ref={searchInputRef}
                  placeholder="Type item name, barcode, or SKU to search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-14 text-lg bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                  autoFocus
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                )}
              </div>

              {searchQuery && (
                <div className="rounded-xl border border-slate-700 bg-slate-800/50 max-h-[400px] overflow-y-auto">
                  {filteredItems.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                      <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>No items found for &quot;{searchQuery}&quot;</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-700">
                      {filteredItems.slice(0, 20).map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleSelectItem(item)}
                          className="p-4 cursor-pointer hover:bg-slate-700/50 transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-white">{item.name}</p>
                              <div className="flex gap-3 mt-1">
                                <span className="text-xs text-slate-400 font-mono">{item.barcode}</span>
                                <span className="text-xs text-slate-500">{item.sku}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-amber-400 font-bold text-lg">Rs. {item.sellingPrice}</p>
                              <p className="text-xs text-slate-500">Stock: {item.stock}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {filteredItems.length > 20 && (
                        <div className="p-3 text-center text-slate-500 text-sm">
                          Showing first 20 results. Refine your search for more specific results.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!searchQuery && (
                <div className="rounded-xl border border-dashed border-slate-700 p-12 text-center">
                  <Search className="h-16 w-16 mx-auto mb-4 text-slate-600" />
                  <p className="text-slate-400 text-lg">Start typing to search items</p>
                  <p className="text-slate-500 text-sm mt-2">
                    Search by item name, barcode number, or SKU
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-amber-400" />
                Print Queue
              </span>
              {selectedItems.length > 0 && (
                <span className="text-sm font-normal text-slate-400">
                  {totalLabels} labels / {totalStrips} strips
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-700 p-8 text-center">
                <Printer className="h-12 w-12 mx-auto mb-3 text-slate-600" />
                <p className="text-slate-400">No items in queue</p>
                <p className="text-slate-500 text-sm mt-1">Search and select items to add</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedItems.map((sel) => (
                  <div
                    key={sel.item.id}
                    className="p-3 rounded-lg bg-slate-800/50 border border-slate-700"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{sel.item.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{sel.item.barcode}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSelectedItem(sel.item.id)}
                        className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/10 -mt-1 -mr-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-amber-400 font-semibold">Rs. {sel.item.sellingPrice}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateCopies(sel.item.id, -1)}
                          className="h-7 w-7 border-slate-600"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-white font-semibold">{sel.copies}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateCopies(sel.item.id, 1)}
                          className="h-7 w-7 border-slate-600"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="pt-3 border-t border-slate-700">
                  <Button
                    onClick={handlePrintAll}
                    disabled={isPrinting || status !== "connected"}
                    className="w-full h-12 gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-900 font-semibold text-lg"
                  >
                    {isPrinting ? (
                      <>Printing...</>
                    ) : (
                      <>
                        <Printer className="h-5 w-5" />
                        Print All ({totalLabels} labels)
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-slate-500 text-center mt-2">
                    {totalStrips} strip(s) will be printed
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-4 border border-amber-500/20">
              <p className="text-xs text-slate-400 font-medium mb-2">How it works</p>
              <ul className="text-xs text-slate-400 space-y-1">
                <li className="flex items-start gap-2">
                  <Check className="h-3 w-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span>Search and click an item to print</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-3 w-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span>Choose qty and print immediately OR add to queue</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-3 w-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span>Labels print 2-up (left + right per strip)</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

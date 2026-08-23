import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { toast } from "sonner";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (period: { type: string; from?: string; to?: string }, format: 'csv' | 'excel' | 'pdf') => void;
}

export function ExportModal({ isOpen, onClose, onConfirm }: ExportModalProps) {
  const [periodType, setPeriodType] = useState("current_week");
  const [formatType, setFormatType] = useState<'csv' | 'excel' | 'pdf'>("excel");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const handleApply = () => {
    if (periodType === "custom") {
      if (!fromDate || !toDate) {
        toast.error("Selecciona ambas fechas");
        return;
      }
      if (new Date(fromDate) > new Date(toDate)) {
        toast.error("La fecha 'desde' no puede ser posterior a 'hasta'");
        return;
      }
    }
    onConfirm({ type: periodType, from: fromDate, to: toDate }, formatType);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exportar Asignaciones</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Período del reporte</Label>
            <Select value={periodType} onValueChange={setPeriodType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current_week">Semana actual</SelectItem>
                <SelectItem value="current_month">Mes actual</SelectItem>
                <SelectItem value="custom">Rango personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Formato de exportación</Label>
            <Select value={formatType} onValueChange={(v: any) => setFormatType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                <SelectItem value="csv">CSV (.csv)</SelectItem>
                <SelectItem value="pdf">PDF (Imprimible)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {periodType === "custom" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Desde</Label>
                  <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Hasta</Label>
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
              </div>
              {fromDate && toDate && new Date(fromDate) <= new Date(toDate) && (
                <p className="text-[11px] font-medium text-primary bg-primary/5 p-2 rounded-md border border-primary/10">
                  Se exportarán las asignaciones desde {format(new Date(fromDate + 'T00:00:00'), "dd/MM/yyyy")} hasta {format(new Date(toDate + 'T00:00:00'), "dd/MM/yyyy")}.
                </p>
              )}
            </div>
          )}

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleApply}>Aplicar Período</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ReactGrid, Column, Row, CellChange, CellStyle } from "@silevis/reactgrid";
import type { DefaultCellTypes, Id, TextCell, HeaderCell } from "@silevis/reactgrid";
import "@silevis/reactgrid/styles.css";
import {  ArrowLeft, Save, Loader2, Bold, Italic, Palette, Plus, Minus, Calculator, Download } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import "../styles/editor.css";

interface Document {
  id: number;
  projectId: number;
  name: string;
  type: string;
  content: string;
  updatedAt: string;
}

interface CellData {
  [key: string]: string | number;
}

export default function SpreadsheetEditor() {
  const { projectId, documentId } = useParams();
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [documentName, setDocumentName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [rows, setRows] = useState<Row<DefaultCellTypes>[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [selectedCell, setSelectedCell] = useState<{ rowId: Id; columnId: Id } | null>(null);
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [cellStyles, setCellStyles] = useState<Map<string, CellStyle>>(new Map());

  // Initialize default spreadsheet structure
  const initializeSpreadsheet = () => {
    const numCols = 15; // Increased from 10
    const numRows = 30; // Increased from 20
    
    const cols: Column[] = [
      { columnId: "header", width: 50 },
      ...Array.from({ length: numCols }, (_, i) => ({
        columnId: String.fromCharCode(65 + i),
        width: 120,
      })),
    ];

    const headerRow: Row<DefaultCellTypes> = {
      rowId: "header",
      cells: [
        { type: "header", text: "" } as HeaderCell,
        ...Array.from({ length: numCols }, (_, i) => ({
          type: "header",
          text: String.fromCharCode(65 + i),
        })) as HeaderCell[],
      ],
    };

    const dataRows: Row<DefaultCellTypes>[] = Array.from({ length: numRows }, (_, i) => ({
      rowId: i,
      cells: [
        { type: "header", text: (i + 1).toString() } as HeaderCell,
        ...Array.from({ length: numCols }, () => ({
          type: "text",
          text: "",
        })) as TextCell[],
      ],
    }));

    setColumns(cols);
    setRows([headerRow, ...dataRows]);
  };

  // Fetch document
  useEffect(() => {
    const fetchDocument = async () => {
      if (!documentId) return;
      try {
        setLoading(true);
        const response = await api(`/api/documents/file/${documentId}`);
        if (response.ok) {
          const data = await response.json();
          setDoc(data);
          setDocumentName(data.name);

          // Load spreadsheet data
          if (data.content) {
            try {
              const parsed = JSON.parse(data.content);
              if (parsed.cells && Object.keys(parsed.cells).length > 0) {
                loadSpreadsheetData(parsed.cells);
              } else {
                initializeSpreadsheet();
              }
            } catch (e) {
              console.error("Error parsing spreadsheet content:", e);
              initializeSpreadsheet();
            }
          } else {
            initializeSpreadsheet();
          }
        }
      } catch (error) {
        console.error("Error fetching document:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [documentId]);

  const loadSpreadsheetData = (cells: CellData) => {
    const numCols = 15;
    const numRows = 30;
    
    const cols: Column[] = [
      { columnId: "header", width: 50 },
      ...Array.from({ length: numCols }, (_, i) => ({
        columnId: String.fromCharCode(65 + i),
        width: 120,
      })),
    ];

    const headerRow: Row<DefaultCellTypes> = {
      rowId: "header",
      cells: [
        { type: "header", text: "" } as HeaderCell,
        ...Array.from({ length: numCols }, (_, i) => ({
          type: "header",
          text: String.fromCharCode(65 + i),
        })) as HeaderCell[],
      ],
    };

    const dataRows: Row<DefaultCellTypes>[] = Array.from({ length: numRows }, (_, i) => ({
      rowId: i,
      cells: [
        { type: "header", text: (i + 1).toString() } as HeaderCell,
        ...Array.from({ length: numCols }, (_, j) => {
          const col = String.fromCharCode(65 + j);
          const cellKey = `${col}${i + 1}`;
          const cellValue = cells[cellKey] ? String(cells[cellKey]) : "";
          return {
            type: "text",
            text: cellValue,
          } as TextCell;
        }) as TextCell[],
      ],
    }));

    setColumns(cols);
    setRows([headerRow, ...dataRows]);
  };

  const handleChanges = (changes: CellChange[]) => {
    console.log('Cell changes:', changes); // Debug log
    
    setRows((prevRows) => {
      const newRows = [...prevRows];
      changes.forEach((change) => {
        const rowIndex = newRows.findIndex((row) => row.rowId === change.rowId);
        if (rowIndex !== -1 && rowIndex > 0) { // Skip header row
          const cellIndex = change.columnId === 'header' ? 0 : 
            columns.findIndex(col => col.columnId === change.columnId);
          
          if (cellIndex !== -1 && cellIndex < newRows[rowIndex].cells.length) {
            // Update the cell with new data
            newRows[rowIndex] = {
              ...newRows[rowIndex],
              cells: newRows[rowIndex].cells.map((cell, idx) => 
                idx === cellIndex ? ({ ...cell, ...change.newCell } as any) : cell
              )
            };
          }
        }
      });
      return newRows;
    });

    // Trigger auto-save
    setTimeout(() => debouncedSave(), 100);
  };

  // Insert formula into selected cell
  const insertFormula = (formula: string) => {
    if (!selectedCell) {
      alert("Please select a cell first");
      return;
    }

    setRows((prevRows) => {
      const newRows = [...prevRows];
      const rowIndex = newRows.findIndex((row) => row.rowId === selectedCell.rowId);
      if (rowIndex !== -1 && rowIndex > 0) {
        const cellIndex = columns.findIndex(col => col.columnId === selectedCell.columnId);
        if (cellIndex !== -1) {
          newRows[rowIndex] = {
            ...newRows[rowIndex],
            cells: newRows[rowIndex].cells.map((cell, idx) => 
              idx === cellIndex ? ({ ...cell, text: formula } as any) : cell
            )
          };
        }
      }
      return newRows;
    });

    debouncedSave();
  };

  // Add a new row
  const addRow = () => {
    const numCols = columns.length - 1;
    const newRowId = rows.length - 1; // Skip header
    
    const newRow: Row<DefaultCellTypes> = {
      rowId: newRowId,
      cells: [
        { type: "header", text: (newRowId + 1).toString() } as HeaderCell,
        ...Array.from({ length: numCols }, () => ({
          type: "text",
          text: "",
        })) as TextCell[],
      ],
    };

    setRows([...rows, newRow]);
    debouncedSave();
  };

  // Delete selected row
  const deleteRow = () => {
    if (!selectedCell || selectedCell.rowId === "header") {
      alert("Please select a data row first");
      return;
    }

    setRows((prevRows) => {
      const newRows = prevRows.filter((row) => row.rowId !== selectedCell.rowId);
      // Renumber rows
      return newRows.map((row, idx) => {
        if (idx === 0) return row; // Keep header
        return {
          ...row,
          rowId: idx - 1,
          cells: row.cells.map((cell, cellIdx) => 
            cellIdx === 0 ? { ...cell, text: idx.toString() } : cell
          )
        };
      });
    });

    setSelectedCell(null);
    debouncedSave();
  };

  // Export to CSV
  const exportToCSV = () => {
    const csvRows: string[] = [];
    
    // Skip header row (index 0)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const csvCols: string[] = [];
      
      // Skip header column (index 0)
      for (let j = 1; j < row.cells.length; j++) {
        const cell: any = row.cells[j];
        const value = cell.text || "";
        // Escape quotes and wrap in quotes if contains comma
        const escapedValue = value.includes(",") || value.includes('"') 
          ? `"${value.replace(/"/g, '""')}"` 
          : value;
        csvCols.push(escapedValue);
      }
      csvRows.push(csvCols.join(","));
    }
    
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = window.document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `${documentName || "spreadsheet"}.csv`);
    link.style.visibility = "hidden";
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  // Debounced save
  const debouncedSave = useCallback(
    (() => {
      let timeout: NodeJS.Timeout;
      return () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => saveDocument(), 2000);
      };
    })(),
    [documentId, rows]
  );

  const saveDocument = async () => {
    if (!documentId) return;

    setIsSaving(true);
    try {
      // Convert rows to cell data
      const cells: CellData = {};
      rows.forEach((row) => {
        if (row.rowId !== "header") {
          row.cells.forEach((cell: any, index) => {
            if (index > 0 && cell.text) {
              const col = String.fromCharCode(64 + index);
              const rowNum = typeof row.rowId === "number" ? row.rowId + 1 : row.rowId;
              const cellKey = `${col}${rowNum}`;
              cells[cellKey] = cell.text;
            }
          });
        }
      });

      const response = await api(`/api/documents/${documentId}`, {
        method: "PUT",
        body: JSON.stringify({
          content: JSON.stringify({ cells }),
          name: documentName,
        }),
      });

      if (response.ok) {
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error("Error saving spreadsheet:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateDocumentName = async () => {
    if (!documentId || !documentName.trim()) return;

    try {
      await api(`/api/documents/${documentId}`, {
        method: "PUT",
        body: JSON.stringify({ name: documentName }),
      });
      setIsEditingName(false);
    } catch (error) {
      console.error("Error updating document name:", error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 z-50 sticky top-0">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Link
            to={`/project/${projectId}`}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          {/* Document Name */}
          <div className="flex-1 min-w-0">
            {isEditingName ? (
              <input
                type="text"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                onBlur={updateDocumentName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") updateDocumentName();
                  if (e.key === "Escape") {
                    setDocumentName(doc?.name || "");
                    setIsEditingName(false);
                  }
                }}
                className="bg-transparent border-none outline-none font-semibold text-foreground w-full"
                autoFocus
              />
            ) : (
              <button
                onClick={() => setIsEditingName(true)}
                className="font-semibold text-foreground hover:text-primary transition-colors truncate text-left w-full"
              >
                {documentName}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          {/* Save Status */}
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : lastSaved ? (
              `Saved ${lastSaved.toLocaleTimeString()}`
            ) : null}
          </div>

          {/* Export Button */}
          <motion.button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors border border-border"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </motion.button>

          {/* Save Button */}
          <motion.button
            onClick={() => saveDocument()}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Save className="w-4 h-4" />
            Save
          </motion.button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="border-b border-border bg-card p-2 flex items-center gap-2 overflow-x-auto sticky top-14 z-40">
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground mr-2">Format:</span>
          <button
            onClick={() => {
              if (!selectedCell) {
                alert("Select a cell first");
                return;
              }
              // Note: Bold/Italic would require custom cell renderer
              alert("Text formatting coming soon! Use formulas for now.");
            }}
            className="p-2 rounded hover:bg-secondary transition-colors"
            title="Bold (Coming Soon)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => alert("Text formatting coming soon!")}
            className="p-2 rounded hover:bg-secondary transition-colors"
            title="Italic (Coming Soon)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={() => alert("Cell coloring coming soon!")}
            className="p-2 rounded hover:bg-secondary transition-colors"
            title="Cell Color (Coming Soon)"
          >
            <Palette className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-6 bg-border" />

        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground mr-2">Functions:</span>
          <button
            onClick={() => {
              const range = prompt("Enter range (e.g., A1:A10):");
              if (range) insertFormula(`=SUM(${range})`);
            }}
            className="px-3 py-1 text-sm rounded hover:bg-secondary transition-colors hover:bg-primary/10"
            title="Sum"
          >
            Σ SUM
          </button>
          <button
            onClick={() => {
              const range = prompt("Enter range (e.g., B1:B10):");
              if (range) insertFormula(`=AVERAGE(${range})`);
            }}
            className="px-3 py-1 text-sm rounded hover:bg-secondary transition-colors hover:bg-primary/10"
            title="Average"
          >
            AVG
          </button>
          <button
            onClick={() => {
              const range = prompt("Enter range (e.g., C1:C10):");
              if (range) insertFormula(`=COUNT(${range})`);
            }}
            className="px-3 py-1 text-sm rounded hover:bg-secondary transition-colors hover:bg-primary/10"
            title="Count"
          >
            COUNT
          </button>
          <Calculator className="w-4 h-4 text-muted-foreground" />
        </div>

        <div className="w-px h-6 bg-border" />

        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground mr-2">Rows/Cols:</span>
          <button
            onClick={addRow}
            className="p-2 rounded hover:bg-secondary transition-colors hover:bg-green-500/10"
            title="Add Row at Bottom"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={deleteRow}
            className="p-2 rounded hover:bg-secondary transition-colors hover:bg-red-500/10"
            title="Delete Selected Row"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Spreadsheet */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
          <ReactGrid
            rows={rows}
            columns={columns}
            onCellsChanged={handleChanges}
            onFocusLocationChanged={(location) => {
              if (location.rowId !== undefined && location.rowId !== null && location.columnId !== undefined && location.columnId !== null) {
                setSelectedCell({ rowId: location.rowId, columnId: location.columnId });
              }
            }}
            enableRangeSelection
            enableFillHandle
            enableRowSelection
            enableColumnSelection
          />
        </div>
        
        {/* Quick Tips */}
        <div className="mt-4 p-4 bg-secondary/50 rounded-lg">
          <p className="text-sm text-muted-foreground mb-2 font-medium">Quick Tips:</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• <strong>Formulas:</strong> =SUM(A1:A10), =AVERAGE(B1:B5), =COUNT(C1:C10)</li>
            <li>• <strong>Auto-fill:</strong> Drag the fill handle (bottom-right corner) to copy cells</li>
            <li>• <strong>Select:</strong> Multiple cells with Shift+Click or Click and Drag</li>
            <li>• <strong>Edit:</strong> Double-click a cell to edit, press Enter to confirm</li>
            <li>• <strong>Export:</strong> Click Export button to download as CSV</li>
            <li>• <strong>Import:</strong> Use Import CSV button in Documents tab to load data</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
